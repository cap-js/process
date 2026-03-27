import { column_expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getEntityDataFromRequest,
  resolveEntityRowOrReject,
} from './utils';
import {
  PROCESS_START_IF,
  LOG_MESSAGES,
  PROCESS_LOGGER_PREFIX,
  BUSINESS_KEY,
  BUSINESS_KEY_MAX_LENGTH,
  PROCESS_START_INPUTS,
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
import { formatBusinessKeyColumn, getBusinessKeyColumn } from '../shared/businessKey-helper';
import { StartAnnotationDescriptor } from '../types/cds-plugin';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// Use InputTreeNode as ProcessStartInput (same structure)
type ProcessStartInput = InputTreeNode;

export function getColumnsForProcessStart(target: Target): (column_expr | string)[] {
  const inputs = parseInputToTreeFromTarget(target);
  if (inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*'];
  } else {
    return convertToColumnsExpr(inputs);
  }
}

export async function handleProcessStart(
  req: cds.Request,
  data: EntityRow,
  startAnnotation: StartAnnotationDescriptor,
): Promise<void> {
  if (isDeleteWithoutProcess(req, LOG_MESSAGES.PROCESS_NOT_STARTED, 'start')) return;

  const target = req.target as Target;
  const processEventKey = PROCESS_EVENT_MAP['start'];
  data = ((req as ProcessDeleteRequest)._Process?.[processEventKey] ??
    getEntityDataFromRequest(data, req.params)) as EntityRow;

  const inputs = parseInputToTreeFromInputs(startAnnotation.inputs, target);

  // if inputs = [] --> no input defined, fetch entire row
  let columns: (column_expr | string)[];
  if (inputs.length === 0) {
    columns = [WILDCARD];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(inputs);
  }

  const businessKeyColumn = startAnnotation.businessKey
    ? formatBusinessKeyColumn(startAnnotation.businessKey)
    : getBusinessKeyColumn((target[BUSINESS_KEY] as { '=': string })?.['=']);

  // fetch entity data (without businessKey to avoid alias collision)
  const row = await resolveEntityRowOrReject(
    req,
    data,
    startAnnotation.conditionExpr,
    'Failed to fetch entity for process start.',
    LOG_MESSAGES.PROCESS_NOT_STARTED,
    columns,
  );
  if (!row) return;

  let businessKeyValue: string | undefined;
  if (businessKeyColumn) {
    if (req.event === 'DELETE') {
      const businessKeyData = (req as ProcessDeleteRequest)._Process?.[
        PROCESS_EVENT_MAP['startBusinessKey']
      ] as EntityRow | undefined;
      businessKeyValue = businessKeyData?.businessKey as string | undefined;
    } else {
      const businessKeyRow = await resolveEntityRowOrReject(
        req,
        data,
        startAnnotation.conditionExpr,
        'Failed to fetch business key for process start.',
        LOG_MESSAGES.PROCESS_NOT_STARTED,
        [businessKeyColumn],
      );
      businessKeyValue = businessKeyRow?.businessKey as string | undefined;
    }

    if (businessKeyValue && businessKeyValue.length > BUSINESS_KEY_MAX_LENGTH) {
      const msg = `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters. Process start will fail.`;
      LOG.error(msg);
      return req.reject({ status: 400, message: msg });
    }
  }

  // emit process start
  const payload = { definitionId: startAnnotation.id!, context: row };
  await emitProcessEvent(
    'start',
    req,
    payload,
    `Failed to start process with definition ID ${startAnnotation.id!}.`,
    businessKeyValue,
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

/**
 * Fetches and attaches businessKey data separately for DELETE operations
 * to avoid alias collision with entity fields named "businessKey"
 */
export const addDeletedEntityToRequestStartBusinessKey = createAddDeletedEntityHandler({
  action: 'startBusinessKey',
  ifAnnotation: PROCESS_START_IF,
  getColumns: (req) => {
    const target = req.target as Target;
    const businessKeyCol = getBusinessKeyColumn((target[BUSINESS_KEY] as { '=': string })?.['=']);
    return businessKeyCol ? [businessKeyCol] : [];
  },
});

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

/**
 * Parses inputs from a raw InputCSNEntry array (from the annotation descriptor)
 * and builds the input tree against the entity context.
 */
function parseInputToTreeFromInputs(
  inputsCSN: InputCSNEntry[] | undefined,
  target: Target,
): ProcessStartInput[] {
  const parsedEntries = parseInputsArray(inputsCSN);
  const runtimeContext = createRuntimeEntityContext(target as cds.entity);
  return buildInputTree(parsedEntries, runtimeContext);
}

/**
 * Parses inputs directly from the target's unqualified @bpm.process.start.inputs annotation.
 * Used by DELETE pre-fetch handlers which still read from the target.
 */
function parseInputToTreeFromTarget(target: Target): ProcessStartInput[] {
  const inputsCSN = target[PROCESS_START_INPUTS] as InputCSNEntry[] | undefined;
  return parseInputToTreeFromInputs(inputsCSN, target);
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
