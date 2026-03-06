import cds, { expr, Results } from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export const PROCESS_EVENT_MAP: Record<string, keyof DeleteProcessObject> = {
  start: 'ProcessStart',
  cancel: 'ProcessCancel',
  suspend: 'ProcessSuspend',
  resume: 'ProcessResume',
};
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
 * CDS request with process-specific data for DELETE operations
 */

export interface ProcessDeleteRequest extends cds.Request {
  _Process?: DeleteProcessObject;
}

type DeleteProcessObject = {
  ProcessStart?: Results;
  ProcessCancel?: Results;
  ProcessSuspend?: Results;
  ProcessResume?: Results;
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
