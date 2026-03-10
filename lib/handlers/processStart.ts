import { column_expr, expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getEntityDataFromRequest,
  resolveEntityRowOrReject,
} from './utils';
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_START_IF,
  PROCESS_START_INPUTS,
  LOG_MESSAGES,
  PROCESS_LOGGER_PREFIX,
  BUSINESS_KEY,
  BUSINESS_KEY_MAX_LENGTH,
} from './../constants';
import {
  InputCSNEntry,
  InputTreeNode,
  parseInputsArray,
  buildInputTree,
  EntityContext,
  WILDCARD,
} from '../shared/input-parser';

import cds from '@sap/cds';
import {
  createAddDeletedEntityHandler,
  isDeleteWithoutProcess,
  PROCESS_EVENT_MAP,
  ProcessDeleteRequest,
} from './onDeleteUtils';
import {
  getBusinessKeyColumnOrReject,
  getBusinessKeyColumnProcessStart,
} from '../shared/businessKey-helper';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// Use InputTreeNode as ProcessStartInput (same structure)
type ProcessStartInput = InputTreeNode;

export type ProcessStartSpec = {
  id?: string;
  on?: string;
  inputs: ProcessStartInput[];
  conditionExpr: expr | undefined;
};

export function getColumnsForProcessStart(target: Target): (column_expr | string)[] {
  const startSpecs = initStartSpecs(target);
  startSpecs.inputs = parseInputToTree(target);
  if (startSpecs.inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*'];
  } else {
    return convertToColumnsExpr(startSpecs.inputs);
  }
}

export async function handleProcessStart(req: cds.Request, data: EntityRow): Promise<void> {
  if (isDeleteWithoutProcess(req, LOG_MESSAGES.PROCESS_NOT_STARTED, 'start')) return;

  const target = req.target as Target;
  const processEventKey = PROCESS_EVENT_MAP['start'];
  data = ((req as ProcessDeleteRequest)._Process?.[processEventKey] ??
    getEntityDataFromRequest(data, req.params)) as EntityRow;

  const startSpecs = initStartSpecs(target);
  startSpecs.inputs = parseInputToTree(target);

  // if startSpecs.input = [] --> no input defined, fetch entire row
  let columns: (column_expr | string)[];
  if (startSpecs.inputs.length === 0) {
    columns = [WILDCARD];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(startSpecs.inputs);
  }

  const businessKeyColumn = getBusinessKeyColumnProcessStart(
    req,
    (target[BUSINESS_KEY] as { '=': string })?.['='],
  );
  if (businessKeyColumn) {
    columns.push(businessKeyColumn);
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

  if ((row.businessKey as string)?.length > BUSINESS_KEY_MAX_LENGTH) {
    const msg = `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters. Process start will fail.`;
    LOG.error(msg);
    return req.reject({ status: 400, message: msg });
  } else {
    row.businessKey = undefined;
  }

  // emit process start
  const payload = { definitionId: startSpecs.id!, context: row };
  await emitProcessEvent(
    'start',
    req,
    payload,
    `Failed to start process with definition ID ${startSpecs.id!}.`,
  );
}

/**
 * Fetches and attaches entity data to the request for DELETE operations
 */
export const addDeletedEntityToRequestStart = createAddDeletedEntityHandler({
  action: 'start',
  ifAnnotation: PROCESS_START_IF,
  getColumns: (req) => getColumnsForProcessStart(req.target as Target),
});

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

/**
 * Creates an EntityContext for runtime cds.entity
 */
function createRuntimeEntityContext(entity: cds.entity): EntityContext {
  return {
    getElement: (name: string) => {
      const element = entity.elements?.[name] as
        | { type?: string; _target?: cds.entity }
        | undefined;
      if (!element) return undefined;

      const isAssocOrComp =
        element.type === 'cds.Association' || element.type === 'cds.Composition';
      const targetEntity = element._target
        ? createRuntimeEntityContext(element._target)
        : createRuntimeEntityContext(entity);

      return { isAssocOrComp, targetEntity };
    },
  };
}

function parseInputToTree(target: Target): ProcessStartInput[] {
  const inputsCSN = target[PROCESS_START_INPUTS] as InputCSNEntry[] | undefined;
  const parsedEntries = parseInputsArray(inputsCSN);
  const runtimeContext = createRuntimeEntityContext(target as cds.entity);
  return buildInputTree(parsedEntries, runtimeContext);
}

function convertToColumnsExpr(array: ProcessStartInput[]): (column_expr | string)[] {
  const result: (column_expr | string)[] = [];

  for (const item of array) {
    // Handle wildcard '*' (from $self) - means all scalar fields
    if (item.sourceElement === WILDCARD) {
      result.push(WILDCARD);
      continue;
    }

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
        column.expand = convertToColumnsExpr(item.associatedInputElements) as column_expr[];
      } else {
        column.expand = ['*'] as unknown as column_expr[];
      }
    }

    result.push(column);
  }

  return result;
}
