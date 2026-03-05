import cds from '@sap/cds';
import { expr, Target } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getBusinessKeyColumnOrReject,
  getEntityDataFromRequest,
  getKeyFieldsForEntity,
  ProcessLifecyclePayload,
  resolveEntityRowOrReject,
} from './utils';
import {
  createAddDeletedEntityHandler,
  isDeleteWithoutProcess,
  PROCESS_EVENT_MAP,
  ProcessDeleteRequest,
} from './onDeleteUtils';
  BUSINESS_KEY_HEADERINFO,
  BUSINESS_KEY_HEADERINFO_BPM,
  BUSINESS_KEY_SEMANTICKEY,
  BUSINESS_KEY_SEMANTICKEY_BPM,
} from '../constants';

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

export function retrieveBusinessKeyExpression(targetAnnotations: Record<string, unknown>) {
  /**
   * Hierarchy:
   *  prio0: @UI.HeaderInfo#bpm.Title.Value
   *  prio1: @UI.HeaderInfo.Title.Value
   *  prio2: @Common.SemanticKey#bpm
   *  prio3: @Common.SemanticKey
   */
  for (const { path, transform } of PRIORITY_CHAIN) {
    const value = targetAnnotations[path];
    if (value === undefined) continue;
    if (transform) {
      return transform(value as { '=': string }[]);
    } else {
      return (value as { '=': string })?.['='];
    }
  }
  return undefined;
}

type AnnotationConfig = {
  path: string;
  transform?: (value: { '=': string }[]) => string | undefined;
};

const PRIORITY_CHAIN: AnnotationConfig[] = [
  { path: BUSINESS_KEY_HEADERINFO_BPM },
  { path: BUSINESS_KEY_HEADERINFO },
  { path: BUSINESS_KEY_SEMANTICKEY_BPM, transform: formatSemanticKey },
  { path: BUSINESS_KEY_SEMANTICKEY, transform: formatSemanticKey },
];

function formatSemanticKey(values: { '=': string }[]): string | undefined {
  let result = undefined;
  for (const value of values) {
    if (!result) {
      result = value['='];
    } else {
      result = result + ' || ' + value['='];
    }
  }
  return result;
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
    await emitProcessEvent(config.action, req, payload, config.logMessages.FAILED);
  };
}

export function createProcessActionAddDeletedEntityHandler(config: ProcessActionDeleteConfig) {
  return createAddDeletedEntityHandler({
    action: config.action,
    ifAnnotation: config.annotations.IF,
    getColumns: (req) => getKeyFieldsForEntity(req.target as cds.entity),
  });
}
