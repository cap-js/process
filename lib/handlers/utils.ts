import cds, { column_expr, expr, Target } from '@sap/cds';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from '../constants';
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
 * For CRUD operations, returns data directly.
 * For bound actions, merges params (entity keys) with data (action inputs).
 */
export function getEntityDataFromRequest(
  data: EntityRow,
  reqParams: Record<string, unknown>[],
): EntityRow {
  if (reqParams && Array.isArray(reqParams) && reqParams.length > 0) {
    const paramsData = reqParams.reduce((acc: EntityRow, param) => {
      if (typeof param === 'object' && param !== null) {
        return { ...acc, ...param };
      }
      return acc;
    }, {});
    return { ...data, ...paramsData };
  }

  return data;
}

async function fetchEntity(
  results: EntityRow,
  request: cds.Request,
  condition: expr | undefined,
  columns?: (column_expr | string)[],
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
 * Fetches entity data or rejects the request with appropriate error
 * Returns undefined if condition is not met (expected case) or if request was rejected
 */
export async function resolveEntityRowOrReject(
  req: cds.Request,
  data: EntityRow,
  conditionExpr: expr | undefined,
  fetchFailedMsg: string,
  notTriggeredMsg: string,
  columns?: (column_expr | string)[],
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
