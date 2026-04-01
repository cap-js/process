import cds, { expr, Results } from '@sap/cds';
import { EntityRow } from './utils';
import { ProcessActionType } from './processActionHandler';

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
  req: cds.Request,
  qualifierKey: string,
  actionKey: ProcessActionType | 'start',
): EntityRow | undefined {
  return (req as ProcessDeleteRequest)._Process?.[actionKey]?.get(qualifierKey) as
    | EntityRow
    | undefined;
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
