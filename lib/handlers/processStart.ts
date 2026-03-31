import { column_expr, Target } from '@sap/cds';
import * as csn from '../types/csn-extensions';
import {
  emitProcessEvent,
  EntityRow,
  getEntityDataFromRequest,
  resolveEntityRowOrReject,
} from './utils';

import {
  LOG_MESSAGES,
  PROCESS_LOGGER_PREFIX,
  PROCESS_PREFIX,
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
import { buildWhereDeleteExpression, ProcessDeleteRequest } from './onDeleteUtils';
import { getBusinessKeyColumn } from '../shared/businessKey-helper';
import { StartAnnotationDescriptor } from '../types/cds-plugin';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// Use InputTreeNode as ProcessStartInput (same structure)
type ProcessStartInput = InputTreeNode;

function getColumnsForDescriptor(
  startAnnotation: StartAnnotationDescriptor,
  target: Target,
): (column_expr | string)[] {
  const inputs = parseInputToTreeFromInputs(startAnnotation.inputs, target);
  if (inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.PROCESS_INPUTS_FROM_DEFINITION);
    if (startAnnotation.id) {
      return resolveColumnsFromProcessDefinition(startAnnotation.id, target);
    } else {
      return [WILDCARD];
    }
  }
  return convertToColumnsExpr(inputs);
}

/**
 * Resolves the business key value for a start annotation.
 * For DELETE: reads from the pre-fetched Map on req._Process.StartBusinessKey.
 * For other events: issues a separate SELECT to avoid alias collision with context columns.
 * Validates business key length and rejects the request if it exceeds the limit.
 *
 * Returns the resolved business key string, or undefined if no business key is configured.
 */
async function resolveBusinessKeyValue(
  req: cds.Request,
  data: EntityRow,
  startAnnotation: StartAnnotationDescriptor,
  qualifierKey: string,
): Promise<string | undefined> {
  const businessKeyColumn = getBusinessKeyColumn(startAnnotation.businessKey);
  if (!businessKeyColumn) return undefined;

  let businessKeyValue: string | undefined;
  if (req.event === 'DELETE') {
    const businessKeyData = getDeletePrefetchedBusinessKey(req, qualifierKey);
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

  return businessKeyValue;
}
export async function handleProcessStart(
  req: cds.Request,
  data: EntityRow,
  startAnnotation: StartAnnotationDescriptor,
): Promise<void> {
  const qualifierKey = startAnnotation.qualifier ?? '';

  // For DELETE: use pre-fetched data for this qualifier; for other events: resolve from request
  if (req.event === 'DELETE') {
    const prefetched = getDeletePrefetchedStart(req, qualifierKey);
    if (!prefetched) {
      LOG.debug(LOG_MESSAGES.PROCESS_NOT_STARTED);
      return;
    }
    data = prefetched;
  } else {
    data = getEntityDataFromRequest(data, req.params) as EntityRow;
  }

  const target = req.target as Target;
  const columns = getColumnsForDescriptor(startAnnotation, target);

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

  const businessKeyValue = await resolveBusinessKeyValue(req, data, startAnnotation, qualifierKey);

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
 * Returns the pre-fetched entity data for a given start qualifier on DELETE,
 * or undefined if the condition was not met / no data was pre-fetched.
 */
function getDeletePrefetchedStart(req: cds.Request, qualifierKey: string): EntityRow | undefined {
  return (req as ProcessDeleteRequest)._Process?.Start?.get(qualifierKey) as EntityRow | undefined;
}

/**
 * Returns the pre-fetched business key data for a given start qualifier on DELETE,
 * or undefined if no business key was pre-fetched.
 */
function getDeletePrefetchedBusinessKey(
  req: cds.Request,
  qualifierKey: string,
): EntityRow | undefined {
  return (req as ProcessDeleteRequest)._Process?.StartBusinessKey?.get(qualifierKey) as
    | EntityRow
    | undefined;
}

/**
 * Pre-fetches entity data and business key for all start annotations before DELETE.
 * Returns a partial _Process object with Maps keyed by qualifier ('' for unqualified).
 *
 * Each start annotation may have different inputs (columns) and conditions,
 * so we issue separate SELECTs per annotation.
 */
export async function prefetchStartDataForDelete(
  req: cds.Request,
  startAnnotations: StartAnnotationDescriptor[],
): Promise<EntityRow | void> {
  const target = req.target as Target;
  const deleteReq = req as ProcessDeleteRequest;

  const startMap = new Map<string, EntityRow>();
  const businessKeyMap = new Map<string, EntityRow>();

  await Promise.all(
    startAnnotations.map(async (ann) => {
      const qualifierKey = ann.qualifier ?? '';
      const conditionExpr = ann.conditionExpr ? { xpr: ann.conditionExpr } : undefined;
      const where = buildWhereDeleteExpression(deleteReq, conditionExpr);
      if (!where) return;

      // Fetch entity data columns for this annotation
      const columns = getColumnsForDescriptor(ann, target);
      const selectColumns = columns.length > 0 ? columns : [WILDCARD];
      const entity = await SELECT.one.from(req.subject).columns(selectColumns).where(where);
      if (entity) {
        startMap.set(qualifierKey, entity);
      }

      // Fetch business key separately (to avoid alias collision)
      const businessKeyColumn = getBusinessKeyColumn(ann.businessKey);
      if (businessKeyColumn) {
        const bkEntity = await SELECT.one
          .from(req.subject)
          .columns([businessKeyColumn])
          .where(where);
        if (bkEntity) {
          businessKeyMap.set(qualifierKey, bkEntity);
        }
      }
    }),
  );

  const result: Record<string, Map<string, EntityRow>> = {};
  if (startMap.size > 0) {
    result.Start = startMap;
  }
  if (businessKeyMap.size > 0) {
    result.StartBusinessKey = businessKeyMap;
  }
  return result;
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

function getProcessInputFieldNames(definitionId: string): string[] | undefined {
  const definitions = cds.model?.definitions;
  if (!definitions) return undefined;
  let serviceName: string | undefined;
  for (const name in definitions) {
    const def = definitions[name] as unknown as csn.CsnBaseDefinition;
    if (def.kind === 'service' && def[PROCESS_PREFIX] === definitionId) {
      serviceName = name;
      break;
    }
  }

  if (!serviceName) return undefined;

  const processInputsType = definitions[`${serviceName}.ProcessInputs`] as
    | { elements?: Record<string, csn.CsnElement> }
    | undefined;

  if (!processInputsType?.elements) return undefined;

  return Object.keys(processInputsType.elements);
}

function resolveColumnsFromProcessDefinition(
  definitionId: string,
  target: Target,
): (column_expr | string)[] {
  const processFields = getProcessInputFieldNames(definitionId);
  if (!processFields) return [WILDCARD];

  const entityElements = Object.keys((target as cds.entity).elements ?? {});
  const matchingFields = processFields.filter((f) => entityElements.includes(f));
  return matchingFields;
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
