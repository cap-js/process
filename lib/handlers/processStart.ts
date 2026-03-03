import { column_expr, entities, entity, expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getBusinessKeyOrReject,
  getEntityDataFromRequest,
  isDeleteWithoutProcess,
  ProcessDeleteRequest,
  resolveEntityRowOrReject,
} from './utils';
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_START_IF,
  PROCESS_START_INPUTS,
  LOG_MESSAGES,
  PROCESS_LOGGER_PREFIX,
} from './../constants';

import cds from '@sap/cds';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

type SimpleInputCSN = { '=': string };
type AliasInputCSN = { path: { '=': string }; as: string };
type InputCSNEntry = SimpleInputCSN | AliasInputCSN;

type ProcessStartInput = {
  sourceElement: string;
  targetVariable?: string;
  associatedInputElements?: ProcessStartInput[];
};
type ProcessEntry = {
  path: string[];
  alias?: string;
};

export type ProcessStartSpec = {
  id?: string;
  on?: string;
  inputs: ProcessStartInput[];
  conditionExpr: expr | undefined;
};

export function getColumnsForProcessStart(
  target: Target,
  req: cds.Request,
): column_expr[] | string[] {
  const startSpecs = initStartSpecs(target);
  if (startSpecs.inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*'];
  } else {
    return convertToColumnsExpr(startSpecs.inputs);
  }
}

export async function handleProcessStart(req: cds.Request, data: EntityRow): Promise<void> {
  if (isDeleteWithoutProcess(req, LOG_MESSAGES.PROCESS_NOT_STARTED)) return;

  const target = req.target as Target;
  data = ((req as ProcessDeleteRequest)._Process ??
    getEntityDataFromRequest(data, req.params)) as EntityRow;

  const startSpecs = initStartSpecs(target);
  startSpecs.inputs = parseInput(target);

  // if startSpecs.input = [] --> no input defined, fetch entire row
  let columns: column_expr[] | string[] = [];
  if (startSpecs.inputs.length === 0) {
    columns = ['*'];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(startSpecs.inputs);
  }

  // fetch entity
  const row = await resolveEntityRowOrReject(
    req,
    data,
    startSpecs.conditionExpr,
    'Failed to fetch entity for process start.',
    LOG_MESSAGES.PROCESS_NOT_STARTED,
    columns,
  );
  if (!row) return;

  // get business key
  const businessKey = getBusinessKeyOrReject(
    target as cds.entity,
    row,
    req,
    'Failed to build business key for process start.',
    'Business key is empty for process start.',
  );
  if (!businessKey) return;

  const context = { ...row, businesskey: businessKey };

  // emit process start
  const payload = { definitionId: startSpecs.id!, context };
  await emitProcessEvent(
    'start',
    req,
    payload,
    `Failed to start process with definition ID ${startSpecs.id!}.`,
    startSpecs.id!,
  );
}

function initStartSpecs(target: Target): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: target[PROCESS_START_ID] as string,
    on: target[PROCESS_START_ON] as string,
    inputs: [],
    conditionExpr: target[PROCESS_START_IF]
      ? ((target[PROCESS_START_IF] as unknown as { xpr: expr }).xpr as expr)
      : undefined,
  };
  return startSpecs;
}

function parseInput(target: Target): ProcessStartInput[] {
  const inputsCSN = target[PROCESS_START_INPUTS] as InputCSNEntry[] | undefined;
  const parsedEntriesinputs = parseInputsArray(inputsCSN);
  const inputTree = buildInputTree(parsedEntriesinputs, target as cds.entity);
  return inputTree;
}

function parsePath(pathString: string): string[] {
  return pathString.replace(/^\$self\./, '').split('.');
}

/**
 * Expected Input CSN structure:
 *  1. Simple input: {'=': '$self.ID'} -> {{path : '$self.ID' }{alias: undefined}}
 *  2. Aliased input: {path: {'=': '$self.ID'}, as: 'myId'} -> {{path: '$self.ID', alias: 'myId'}}
 *  3. No inputs: -> []
 */

function parseInputsArray(inputsCSN: InputCSNEntry[] | undefined): ProcessEntry[] {
  if (!inputsCSN || inputsCSN.length === 0) {
    return [];
  }
  const parsedEntries: ProcessEntry[] = [];
  for (const entry of inputsCSN) {
    for (const key in entry) {
      if (key === '=') {
        const simpleEntry = entry as SimpleInputCSN;
        parsedEntries.push({ path: parsePath(simpleEntry[key]), alias: undefined });
      }

      if (key === 'path') {
        const aliasEntry = entry as AliasInputCSN;
        parsedEntries.push({ path: parsePath(aliasEntry.path['=']), alias: aliasEntry.as });
      }
    }
  }
  return parsedEntries;
}

enum BuildState {
  GROUP_ENTRIES = 'GROUP_ENTRIES',
  PROCESS_ELEMENT = 'PROCESS_ELEMENT',
  CHECK_NESTED = 'CHECK_NESTED',
  BUILD_SIMPLE = 'BUILD_SIMPLE',
  BUILD_ASSOC = 'BUILD_ASSOC',
  BUILD_NESTED = 'BUILD_NESTED',
  NEXT_ELEMENT = 'NEXT_ELEMENT',
  DONE = 'DONE',
}

function buildInputTree(entries: ProcessEntry[], rootEntity: cds.entity): ProcessStartInput[] {
  if (entries.length === 0) {
    return [];
  }

  const result: ProcessStartInput[] = [];
  let state: BuildState = BuildState.GROUP_ENTRIES;

  let groups: Map<string, ProcessEntry[]> = new Map();
  let elementNames: string[] = [];
  let currentIndex: number = 0;
  let currentElementName: string = '';
  let currentGroup: ProcessEntry[] = [];
  let directAlias: string | undefined = undefined;
  let nestedEntries: ProcessEntry[] = [];

  while (state !== BuildState.DONE) {
    switch (state) {
      case BuildState.GROUP_ENTRIES: {
        for (const entry of entries) {
          const firstSegment = entry.path[0];
          if (!groups.has(firstSegment)) {
            groups.set(firstSegment, []);
          }
          groups.get(firstSegment)!.push(entry);
        }
        elementNames = Array.from(groups.keys());
        currentIndex = 0;
        state = BuildState.PROCESS_ELEMENT;
        break;
      }

      case BuildState.PROCESS_ELEMENT: {
        if (currentIndex >= elementNames.length) {
          state = BuildState.DONE;
          break;
        }
        currentElementName = elementNames[currentIndex];
        currentGroup = groups.get(currentElementName)!;

        const directEntry = currentGroup.find((e) => e.path.length === 1);

        directAlias = directEntry?.alias;
        nestedEntries = currentGroup
          .filter((e) => e.path.length > 1)
          .map((e) => ({ path: e.path.slice(1), alias: e.alias }));

        state = BuildState.CHECK_NESTED;
        break;
      }

      case BuildState.CHECK_NESTED: {
        const element = rootEntity.elements?.[currentElementName];
        const isAssocOrComp =
          element?.type === 'cds.Association' || element?.type === 'cds.Composition';

        if (nestedEntries.length > 0) {
          state = BuildState.BUILD_NESTED;
        } else if (isAssocOrComp) {
          state = BuildState.BUILD_ASSOC;
        } else {
          state = BuildState.BUILD_SIMPLE;
        }
        break;
      }

      case BuildState.BUILD_SIMPLE: {
        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.BUILD_ASSOC: {
        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
          associatedInputElements: [],
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.BUILD_NESTED: {
        const element = rootEntity.elements?.[currentElementName];
        const targetEntity = (element as { _target?: cds.entity })?._target ?? rootEntity;
        const nestedResults = buildInputTree(nestedEntries, targetEntity);

        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
          associatedInputElements: nestedResults,
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.NEXT_ELEMENT: {
        currentIndex++;
        state = BuildState.PROCESS_ELEMENT;
        break;
      }
    }
  }

  return result;
}

function convertToColumnsExpr(array: ProcessStartInput[]): column_expr[] {
  return array.map((item) => {
    const column: column_expr = {};

    // Start with the source element as a ref
    column.ref = [item.sourceElement];

    // Add alias if targetVariable exists
    if (item.targetVariable) {
      column.as = item.targetVariable;
    }

    // Handle nested associations (expand)
    // If associatedInputElements is defined (i.e., this is an association):
    // - If it has elements, expand with those specific elements
    // - If it's empty (no annotated elements in associated entity), expand with '*' to get all direct attributes
    if (item.associatedInputElements !== undefined) {
      if (item.associatedInputElements.length > 0) {
        column.expand = convertToColumnsExpr(item.associatedInputElements);
      } else {
        column.expand = ['*'] as unknown as column_expr[];
      }
    }

    return column;
  });
}
