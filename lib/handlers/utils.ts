import cds, { column_expr, expr, Results, Target } from '@sap/cds';
import {
  BUILD_PREFIX,
  PROCESS_CANCEL_IF,
  PROCESS_CANCEL_ON,
  PROCESS_LOGGER_PREFIX,
  PROCESS_RESUME_IF,
  PROCESS_RESUME_ON,
  PROCESS_SERVICE,
  PROCESS_START_IF,
  PROCESS_START_ON,
  PROCESS_SUSPEND_IF,
  PROCESS_SUSPEND_ON,
  PROCESS_START_QUALIFIER_PREFIX,
  PROCESS_START_QUALIFIER_PATTERN,
} from '../constants';
import { getColumnsForProcessStart } from './processStart';
const { SELECT } = cds.ql;
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

/**
 * A row of entity data with string-keyed fields
 */
export interface EntityRow {
  [key: string]: unknown;
}

/**
 * Payload for process start events
 */
export interface ProcessStartPayload {
  definitionId: string;
  context: EntityRow;
}

/**
 * Payload for process lifecycle events (cancel, suspend, resume)
 */
export interface ProcessLifecyclePayload {
  businessKey: string;
  cascade: boolean;
}

/**
 * Element annotation with metadata
 */
export interface ElementAnnotation {
  elementName: string;
  annotationKey: string;
  annotationValue: string;
  associatedTarget?: cds.entity;
}

/**
 * Process event types supported by the system
 */
export type ProcessEventType = 'start' | 'cancel' | 'suspend' | 'resume';

/**
 * Extended CDS Target with annotation access
 */
export type AnnotatedTarget = Target & {
  [key: `@${string}`]: unknown;
};

/**
 * CDS request with process-specific data for DELETE operations
 */

export interface ProcessDeleteRequest extends cds.Request {
  _Process?: Results;
}

/**
 * Mapping of annotation ON keys to their corresponding IF keys
 */
const ANNOTATION_ON_TO_IF_MAP: Record<string, string> = {
  [PROCESS_CANCEL_ON]: PROCESS_CANCEL_IF,
  [PROCESS_START_ON]: PROCESS_START_IF,
  [PROCESS_SUSPEND_ON]: PROCESS_SUSPEND_IF,
  [PROCESS_RESUME_ON]: PROCESS_RESUME_IF,
};

/**
 * Checks if an element is an association or composition type
 */
function isAssociationType(element: cds.struct['elements'][string]): boolean {
  return element.type === 'cds.Association' || element.type === 'cds.Composition';
}

/**
 * Extracts key field names from a CDS entity
 */
export function getKeyFieldsForEntity(entity: cds.entity): string[] {
  const keys = entity.keys;
  const result: string[] = [];
  for (const key in keys) {
    result.push(key);
  }
  return result;
}

/**
 * Concatenates all key field values into a single business key string
 */
export function concatenateBusinessKey(target: cds.entity, row: EntityRow): string {
  let businessKey = '';
  for (const keyField of getKeyFieldsForEntity(target)) {
    businessKey += String(row[keyField] ?? '');
  }
  return businessKey;
}

/**
 * Extracts entity data from a CDS request.
 * For CRUD operations, returns req.data directly.
 * For bound actions, merges req.params (entity keys) with req.data (action inputs).
 */
export function getEntityDataFromRequest(req: cds.Request): EntityRow {
  const data = (req.data as EntityRow) ?? {};
  if (req.params && Array.isArray(req.params) && req.params.length > 0) {
    const paramsData = req.params.reduce((acc: EntityRow, param) => {
      if (typeof param === 'object' && param !== null) {
        return { ...acc, ...param };
      }
      return acc;
    }, {});
    return { ...data, ...paramsData };
  }

  return data;
}

/**
 * Extracts element annotations that start with BUILD_PREFIX from a CDS entity
 */
export function getElementAnnotations(entity: cds.entity): ElementAnnotation[] {
  const elementAnnotations: ElementAnnotation[] = [];
  for (const elementName in entity.elements) {
    const element = entity.elements[elementName];
    for (const key in element) {
      if (!key.startsWith(BUILD_PREFIX)) {
        continue;
      }
      const value = element[key as keyof typeof element];
      // for association elements: element._target.elements
      let associatedTarget: cds.entity | undefined;
      if (isAssociationType(element)) {
        associatedTarget = element._target;
      }
      elementAnnotations.push({
        elementName,
        annotationKey: key,
        annotationValue: String(value),
        associatedTarget,
      });
    }
  }
  return elementAnnotations;
}

async function fetchEntity(
  results: EntityRow,
  request: cds.Request,
  condition: expr | undefined,
  columns?: column_expr[] | string[],
): Promise<EntityRow | undefined> {
  if (typeof results !== 'object') {
    results = {};
  }

  const keyFields = getKeyFieldsForEntity(request.target as cds.entity);

  // build where clause
  const where = buildWhereClause(keyFields, results, condition);

  const fetchedData = await SELECT.one
    .from(request.target.name)
    .columns(columns ? columns : keyFields)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(where as any);

  if (!fetchedData) {
    // condition not met
    return undefined;
  }

  return { ...fetchedData };
}

function buildWhereClause(
  keyFields: string[],
  results: EntityRow,
  condition: expr | undefined,
): unknown {
  const keyObject = keyFields.reduce((obj: Record<string, unknown>, keyField: string) => {
    obj[keyField] = results[keyField];
    return obj;
  }, {});

  // build where expression for object keys
  const parts: unknown[] = [];
  for (const key in keyObject) {
    if (Object.hasOwn(keyObject, key)) {
      const object = keyObject[key];
      if (parts.length) parts.push('and');
      parts.push({ ref: [key] }, '=', { val: object });
    }
  }
  // { ref: [ 'ID' ] }, '=', { val: '123456' }
  let where;
  if (condition !== undefined) {
    where = [{ xpr: parts }, 'and', { xpr: condition }];
  } else {
    where = { xpr: parts };
  }
  return where;
}

/**
 * Fetches and attaches entity data to the request for DELETE operations
 */
export async function addDeletedEntityToRequest(
  req: cds.Request,
  areStartAnnotationsDefined: boolean,
): Promise<void> {
  const target = req.target as Target;
  let columns: column_expr[] | string[] = [];
  if (areStartAnnotationsDefined) {
    columns = await getColumnsForProcessStart(target, req);
  } else {
    columns = getKeyFieldsForEntity(target as cds.entity);
  }

  const deleteReq = req as ProcessDeleteRequest;
  const deleteQuery = deleteReq.query?.DELETE as
    | { from?: { ref?: Array<{ where?: unknown }> }; where?: unknown }
    | undefined;
  let where: unknown = deleteQuery?.from?.ref?.[0]?.where ?? deleteQuery?.where;

  const annotatedTarget = target as unknown as Record<string, unknown>;
  const onAnnotations = [
    PROCESS_CANCEL_ON,
    PROCESS_START_ON,
    PROCESS_SUSPEND_ON,
    PROCESS_RESUME_ON,
  ];
  for (const annotationKey of onAnnotations) {
    if (annotatedTarget[annotationKey] && annotatedTarget[annotationKey] === 'DELETE') {
      const annotationIf = ANNOTATION_ON_TO_IF_MAP[annotationKey];
      const conditionExpr = annotatedTarget[annotationIf] as { xpr: expr } | undefined;
      if (conditionExpr) {
        where =
          Array.isArray(where) && where.length
            ? [{ xpr: where }, 'and', { xpr: conditionExpr.xpr }]
            : conditionExpr.xpr;
      }
    }
  }

  // Handle qualified start annotations: @bpm.process.start #qualifier: { on: 'DELETE', if: ... }
  // CDS stores as @bpm.process.start#qualifier.on, @bpm.process.start#qualifier.if
  if (areStartAnnotationsDefined) {
    for (const key of Object.keys(annotatedTarget)) {
      const match = key.match(PROCESS_START_QUALIFIER_PATTERN);
      if (match && annotatedTarget[key] === 'DELETE') {
        const qualifier = match[1];
        const conditionExpr = annotatedTarget[`${PROCESS_START_QUALIFIER_PREFIX}${qualifier}.if`] as
          | { xpr: expr }
          | undefined;
        if (conditionExpr) {
          where =
            Array.isArray(where) && where.length
              ? [{ xpr: where }, 'and', { xpr: conditionExpr.xpr }]
              : conditionExpr.xpr;
        }
      }
    }
  }

  if (where) {
    // Safeguard: use ['*'] if columns array is empty to avoid invalid SQL
    const selectColumns = columns.length > 0 ? columns : ['*'];
    const entities = await SELECT.one.from(req.subject).columns(selectColumns).where(where);
    (req as ProcessDeleteRequest)._Process = entities;
  }
}

/**
 * Checks if this is a DELETE request without process data (condition not met)
 */
export function isDeleteWithoutProcess(req: cds.Request, notTriggeredMsg: string): boolean {
  if (
    req.event === 'DELETE' &&
    ((req as ProcessDeleteRequest)._Process === undefined ||
      (req as ProcessDeleteRequest)._Process?.length === 0)
  ) {
    // means: condition for process event is not met
    LOG.debug(notTriggeredMsg);
    return true;
  }
  return false;
}

/**
 * Fetches entity data or rejects the request with appropriate error
 * Returns undefined if condition is not met (expected case) or if request was rejected
 */
export async function resolveEntityRowOrReject(
  req: cds.Request,
  data: EntityRow,
  conditionExpr: expr | undefined,
  fetchFailedMsg: string,
  notTriggeredMsg: string,
  columns?: column_expr[] | string[],
): Promise<EntityRow | undefined> {
  let row: EntityRow | undefined;
  try {
    row =
      req.event === 'DELETE'
        ? data
        : await fetchEntity(data, req, conditionExpr, columns ?? undefined);
  } catch (error) {
    LOG.error(fetchFailedMsg, error);
    req.reject({
      status: 500,
      message: fetchFailedMsg,
    });
    return undefined;
  }

  if (!row) {
    LOG.debug(notTriggeredMsg);
    return undefined;
  }

  return row;
}

/**
 * Extracts business key from entity row or rejects the request
 * Returns undefined if request was rejected
 */
export function getBusinessKeyOrReject(
  target: cds.entity,
  row: EntityRow,
  req: cds.Request,
  invalidKeyMsg: string,
  emptyKeyMsg: string,
): string | undefined {
  let businessKey: string;
  try {
    businessKey = concatenateBusinessKey(target, { ...row, ...req.data });
  } catch (error) {
    LOG.error(invalidKeyMsg, error);
    req.reject({ status: 400, message: invalidKeyMsg });
    return undefined;
  }

  if (!businessKey) {
    req.reject({ status: 400, message: emptyKeyMsg });
    return undefined;
  }

  return businessKey;
}

/**
 * Emits a process event to the outboxed ProcessService
 */
export async function emitProcessEvent(
  event: ProcessEventType,
  req: cds.Request,
  payload: ProcessStartPayload | ProcessLifecyclePayload,
  processEventFailedMsg: string,
  msgArgs: string,
): Promise<void> {
  try {
    const processService = await cds.connect.to(PROCESS_SERVICE);
    const queuedProcessService = cds.queued(processService);
    await queuedProcessService.emit(event, payload);
  } catch (error) {
    LOG.error(processEventFailedMsg, msgArgs, error);
    req.reject({ status: 500, message: processEventFailedMsg, args: [msgArgs] });
  }
}
