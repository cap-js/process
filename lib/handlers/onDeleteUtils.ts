import cds, { expr, Results } from '@sap/cds';

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
