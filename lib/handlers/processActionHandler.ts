import cds from '@sap/cds';
import { expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getBusinessKeyOrReject,
  getEntityDataFromRequest,
  isDeleteWithoutProcess,
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
  return async function handleProcessAction(req: cds.Request): Promise<void> {
    if (isDeleteWithoutProcess(req, config.logMessages.NOT_TRIGGERED)) return;

    const target = req.target as Target;
    const data = ((req as ProcessDeleteRequest)._Process ??
      getEntityDataFromRequest(req)) as EntityRow;

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
