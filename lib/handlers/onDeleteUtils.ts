import cds, { expr, Results } from '@sap/cds';
import { EntityRow } from './utils';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { ProcessActionType } from './processActionHandler';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export interface ProcessDeleteRequest extends cds.Request {
  _Process?: DeleteProcessObject;
}

type DeleteProcessObject = {
  start?: Map<string, Results>;
  startBusinessKey?: Map<string, Results>;
  cancel?: Map<string, Results>;
  suspend?: Map<string, Results>;
  resume?: Map<string, Results>;
};

export function getPrefetchedDataForDelete(
  req: ProcessDeleteRequest,
  actionKey: ProcessActionType,
  qualifierKey: string,
  logMsgNotTriggered: string,
): EntityRow | undefined {
  const prefetchMap = req._Process?.[actionKey] as Map<string, Results> | undefined;
  const prefetched = prefetchMap?.get(qualifierKey) as EntityRow | undefined;
  if (!prefetched) {
    LOG.debug(logMsgNotTriggered);
    return undefined;
  }
  return prefetched;
}

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
