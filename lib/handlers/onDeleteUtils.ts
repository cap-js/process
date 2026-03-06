import cds, { column_expr, expr, Results } from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { EntityRow } from './utils';
import { WILDCARD } from '../shared/input-parser';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export const PROCESS_EVENT_MAP: Record<string, keyof DeleteProcessObject> = {
  start: 'Start',
  cancel: 'Cancel',
  suspend: 'Suspend',
  resume: 'Resume',
};

interface AddDeletedEntityConfig {
  action: string;
  ifAnnotation: string;
  getColumns: (req: cds.Request) => Promise<(column_expr | string)[]> | (column_expr | string)[];
}

export interface ProcessDeleteRequest extends cds.Request {
  _Process?: DeleteProcessObject;
}

type DeleteProcessObject = {
  Start?: Results;
  Cancel?: Results;
  Suspend?: Results;
  Resume?: Results;
};

function buildWhereDeleteExpression(
  req: ProcessDeleteRequest,
  conditionExpr: { xpr: expr } | undefined,
): unknown {
  const deleteReq = req as ProcessDeleteRequest;
  const deleteQuery = deleteReq.query?.DELETE as
    | { from?: { ref?: Array<{ where?: unknown }> }; where?: unknown }
    | undefined;
  let where: unknown = deleteQuery?.from?.ref?.[0]?.where ?? deleteQuery?.where;

  if (conditionExpr) {
    where =
      Array.isArray(where) && where.length
        ? [{ xpr: where }, 'and', { xpr: conditionExpr.xpr }]
        : conditionExpr.xpr;
  }
  return where;
}

/**
 * Checks if this is a DELETE request without process data (condition not met)
 */
export function isDeleteWithoutProcess(
  req: cds.Request,
  notTriggeredMsg: string,
  processEvent: string,
): boolean {
  const processEventKey = PROCESS_EVENT_MAP[processEvent];
  if (
    req.event === 'DELETE' &&
    (req as ProcessDeleteRequest)._Process?.[processEventKey] === undefined
  ) {
    // means: condition for process event is not met
    LOG.debug(notTriggeredMsg);
    return true;
  }
  return false;
}

/**
 * Generic factory to create a before-DELETE handler that pre-fetches
 * entity data and attaches it to the request under `_Process.[ProcessEvent]`.
 */
export function createAddDeletedEntityHandler(config: AddDeletedEntityConfig) {
  return async function addDeletedEntityToRequest(req: cds.Request): Promise<EntityRow | void> {
    const columns = await config.getColumns(req);

    const annotatedTarget = req.target as cds.entity;
    const conditionExpr = annotatedTarget[config.ifAnnotation as string] as
      | { xpr: expr }
      | undefined;
    const where = buildWhereDeleteExpression(req as ProcessDeleteRequest, conditionExpr);

    if (where) {
      const selectColumns = columns.length > 0 ? columns : [WILDCARD];
      const processEventKey = PROCESS_EVENT_MAP[config.action];
      const entity = await SELECT.one.from(req.subject).columns(selectColumns).where(where);
      return { [processEventKey]: entity };
    }
  };
}
