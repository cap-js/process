import cds, { expr, Results } from '@sap/cds';
import { EntityRow } from './utils';
import { DeleteProcessMapKey } from './processActionHandler';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export interface ProcessDeleteRequest extends cds.Request {
  _Process?: DeleteProcessObject;
}

type DeleteProcessObject = {
  Start?: Map<string, Results>;
  StartBusinessKey?: Map<string, Results>;
  Cancel?: Map<string, Results>;
  Suspend?: Map<string, Results>;
  Resume?: Map<string, Results>;
};

export function buildWhereDeleteExpression(
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

export function getPrefetchedDataForDelete(
  req: ProcessDeleteRequest,
  deleteKey: DeleteProcessMapKey,
  qualifierKey: string,
  logMsgNotTriggered: string,
): EntityRow | undefined {
  const prefetchMap = req._Process?.[deleteKey] as Map<string, Results> | undefined;
  const prefetched = prefetchMap?.get(qualifierKey) as EntityRow | undefined;
  if (!prefetched) {
    LOG.debug(logMsgNotTriggered);
    return undefined;
  }
  return prefetched;
}
