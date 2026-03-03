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

function buildInputTree(entries: ProcessEntry[], rootEntity: cds.entity): ProcessStartInput[] {
  type StackItem = {
    entries: ProcessEntry[];
    entity: cds.entity;
    resultTarget: ProcessStartInput[];
  };

  const rootResult: ProcessStartInput[] = [];
  const stack: StackItem[] = [{ entries, entity: rootEntity, resultTarget: rootResult }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentEntries = current.entries;
    const currentEntity = current.entity;
    const result = current.resultTarget;

    const rootAliases = new Map<string, string>();
    for (let i = 0; i < currentEntries.length; i++) {
      const entry = currentEntries[i];
      if (entry.path.length === 1 && entry.alias) {
        rootAliases.set(entry.path[0], entry.alias);
      }
    }

    const elementsWithChildren = new Set<string>();
    for (let i = 0; i < currentEntries.length; i++) {
      const entry = currentEntries[i];
      if (entry.path.length > 1) {
        elementsWithChildren.add(entry.path[0]);
      }
    }

    const nestedMap = new Map<string, { path: string[]; alias?: string }[]>();

    for (let i = 0; i < currentEntries.length; i++) {
      const entry = currentEntries[i];

      if (entry.path.length === 1) {
        const elementName = entry.path[0];
        const element = currentEntity.elements?.[elementName];
        const isAssocOrComp =
          element?.type === 'cds.Association' || element?.type === 'cds.Composition';

        if (isAssocOrComp && !elementsWithChildren.has(elementName)) {
          result.push({
            sourceElement: elementName,
            targetVariable: entry.alias,
            associatedInputElements: [],
          });
        } else {
          result.push({
            sourceElement: elementName,
            targetVariable: entry.alias,
          });
        }
      } else {
        const rootElement = entry.path[0];
        const remaining = { path: entry.path.slice(1), alias: entry.alias };

        if (!nestedMap.has(rootElement)) {
          nestedMap.set(rootElement, []);
        }
        nestedMap.get(rootElement)!.push(remaining);
      }
    }

    const nestedKeys = Array.from(nestedMap.keys());
    for (let i = 0; i < nestedKeys.length; i++) {
      const rootElement = nestedKeys[i];
      const nestedEntries = nestedMap.get(rootElement)!;
      const element = currentEntity.elements?.[rootElement];
      const targetEntity = (element as { _target?: cds.entity })?._target ?? currentEntity;

      let existing: ProcessStartInput | undefined;
      for (let j = 0; j < result.length; j++) {
        if (result[j].sourceElement === rootElement) {
          existing = result[j];
          break;
        }
      }

      if (existing) {
        existing.associatedInputElements = [];
        stack.push({
          entries: nestedEntries,
          entity: targetEntity,
          resultTarget: existing.associatedInputElements,
        });
      } else {
        const newEntry: ProcessStartInput = {
          sourceElement: rootElement,
          targetVariable: rootAliases.get(rootElement),
          associatedInputElements: [],
        };
        result.push(newEntry);
        stack.push({
          entries: nestedEntries,
          entity: targetEntity,
          resultTarget: newEntry.associatedInputElements!,
        });
      }
    }
  }

  return rootResult;
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
