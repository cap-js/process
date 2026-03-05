import cds, { column_expr } from '@sap/cds';
import { expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getBusinessKeyOrReject,
  getEntityDataFromRequest,
  getKeyFieldsForEntity,
  isDeleteWithoutProcess,
  PROCESS_EVENT_MAP,
  ProcessDeleteRequest,
  ProcessLifecyclePayload,
  resolveEntityRowOrReject,
} from './utils';

export type ProcessActionType = 'cancel' | 'resume' | 'suspend';

export interface ProcessActionSpec {
  on?: string;
  cascade: boolean;
  conditionExpr: expr | undefined;
}

export interface ProcessActionConfig {
  action: ProcessActionType;
  annotations: {
    ON: string;
    CASCADE: string;
    IF: string;
  };
  logMessages: {
    NOT_TRIGGERED: string;
    FETCH_FAILED: string;
    INVALID_KEY: string;
    EMPTY_KEY: string;
    FAILED: string;
  };
}

function initSpecs(
  target: Target,
  annotations: ProcessActionConfig['annotations'],
): ProcessActionSpec {
  const targetAnnotations = target as unknown as Record<string, unknown>;
  return {
    on: targetAnnotations[annotations.ON] as string,
    cascade: (targetAnnotations[annotations.CASCADE] as boolean) ?? false,
    conditionExpr: targetAnnotations[annotations.IF]
      ? (targetAnnotations[annotations.IF] as { xpr: expr }).xpr
      : undefined,
  };
}

export function createProcessActionHandler(config: ProcessActionConfig) {
  return async function handleProcessAction(req: cds.Request, data: EntityRow): Promise<void> {
    if (isDeleteWithoutProcess(req, config.logMessages.NOT_TRIGGERED, config.action)) return;

    const target = req.target as Target;
    const processEventKey = PROCESS_EVENT_MAP[config.action];
    data = ((req as ProcessDeleteRequest)._Process?.[processEventKey] ??
      getEntityDataFromRequest(data, req.params)) as EntityRow;
    // Initialize specifications from annotations
    const specs = initSpecs(target, config.annotations);

    // fetch entity
    const row = await resolveEntityRowOrReject(
      req,
      data,
      specs.conditionExpr,
      config.logMessages.FETCH_FAILED,
      config.logMessages.NOT_TRIGGERED,
    );
    if (!row) return;

    // Get business key
    const businessKey = getBusinessKeyOrReject(
      target as cds.entity,
      row,
      req,
      config.logMessages.INVALID_KEY,
      config.logMessages.EMPTY_KEY,
    );
    if (!businessKey) return;

    // Emit process event
    const payload: ProcessLifecyclePayload = { businessKey, cascade: specs.cascade };
    await emitProcessEvent(config.action, req, payload, config.logMessages.FAILED, businessKey);
  };
}
export interface ProcessActionDeleteConfig {
  action: ProcessActionType;
  annotations: {
    IF: string;
  };
}
export function createProcessActionAddDeletedEntityHandler(config: ProcessActionDeleteConfig) {
  return async function addDeletedEntityToRequest(req: cds.Request): Promise<void> {
    const target = req.target as Target;
    let columns: (column_expr | string)[] = [];

    columns = getKeyFieldsForEntity(target as cds.entity);

    const deleteReq = req as ProcessDeleteRequest;
    const deleteQuery = deleteReq.query?.DELETE as
      | { from?: { ref?: Array<{ where?: unknown }> }; where?: unknown }
      | undefined;
    let where: unknown = deleteQuery?.from?.ref?.[0]?.where ?? deleteQuery?.where;

    const annotatedTarget = target as unknown as Record<string, unknown>;

    const conditionExpr = annotatedTarget[config.annotations.IF] as { xpr: expr } | undefined;
    if (conditionExpr) {
      where =
        Array.isArray(where) && where.length
          ? [{ xpr: where }, 'and', { xpr: conditionExpr.xpr }]
          : conditionExpr.xpr;
    }

    if (where) {
      // Safeguard: use ['*'] if columns array is empty to avoid invalid SQL
      const selectColumns = columns.length > 0 ? columns : ['*'];
      const processEventKey = PROCESS_EVENT_MAP[config.action];
      const deleteReq = req as ProcessDeleteRequest;
      const entities = await SELECT.one.from(req.subject).columns(selectColumns).where(where);
      deleteReq._Process = { ...deleteReq._Process, [processEventKey]: entities };
    }
  };
}
