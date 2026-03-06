import cds from '@sap/cds';
import { expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getBusinessKeyColumnOrReject,
  getEntityDataFromRequest,
  ProcessLifecyclePayload,
  resolveEntityRowOrReject,
  retrieveBusinessKeyExpression,
} from './utils';
import {
  createAddDeletedEntityHandler,
  isDeleteWithoutProcess,
  PROCESS_EVENT_MAP,
  ProcessDeleteRequest,
} from './onDeleteUtils';

type ProcessActionType = 'cancel' | 'resume' | 'suspend';

interface ProcessActionSpec {
  on?: string;
  cascade: boolean;
  conditionExpr: expr | undefined;
  businessKey: string | undefined;
}

interface ProcessActionConfig {
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
interface ProcessActionDeleteConfig {
  action: ProcessActionType;
  annotations: {
    IF: string;
  };
}

function initSpecs(
  target: Target,
  annotations: ProcessActionConfig['annotations'],
): ProcessActionSpec {
  const targetAnnotations = target as cds.entity;
  return {
    on: targetAnnotations[annotations.ON] as string,
    cascade: (targetAnnotations[annotations.CASCADE] as boolean) ?? false,
    conditionExpr: targetAnnotations[annotations.IF]
      ? (targetAnnotations[annotations.IF] as { xpr: expr }).xpr
      : undefined,
    businessKey: retrieveBusinessKeyExpression(targetAnnotations),
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

    // Get business key column
    const businessKeyColumn = getBusinessKeyColumnOrReject(req, specs.businessKey);

    // fetch entity
    const row = await resolveEntityRowOrReject(
      req,
      data,
      specs.conditionExpr,
      config.logMessages.FETCH_FAILED,
      config.logMessages.NOT_TRIGGERED,
      [businessKeyColumn],
    );
    if (!row) return;

    // Emit process event
    const payload: ProcessLifecyclePayload = {
      businessKey: (row as { businessKey: string }).businessKey,
      cascade: specs.cascade,
    };
    await emitProcessEvent(
      config.action,
      req,
      payload,
      config.logMessages.FAILED,
      (row as { businessKey: string }).businessKey,
    );
  };
}

export function createProcessActionAddDeletedEntityHandler(config: ProcessActionDeleteConfig) {
  return createAddDeletedEntityHandler({
    action: config.action,
    ifAnnotation: config.annotations.IF,
    getColumns: (req) => [
      getBusinessKeyColumnOrReject(req, retrieveBusinessKeyExpression(req.target as cds.entity)),
    ],
  });
}
