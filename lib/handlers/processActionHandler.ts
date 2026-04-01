import cds from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getEntityDataFromRequest,
  ProcessLifecyclePayload,
  resolveEntityRowOrReject,
} from './utils';
import {
  buildWhereDeleteExpression,
  getPrefetchedDataForDelete,
  ProcessDeleteRequest,
} from './onDeleteUtils';
import {
  formatBusinessKeyColumn,
  getBusinessKeyColumnOrReject,
} from '../shared/businessKey-helper';
import { LifecycleAnnotationDescriptor } from '../types/cds-plugin';

export type ProcessActionType = 'cancel' | 'resume' | 'suspend';

interface ProcessActionConfig {
  action: ProcessActionType;
  logMessages: {
    NOT_TRIGGERED: string;
    FETCH_FAILED: string;
    INVALID_KEY: string;
    EMPTY_KEY: string;
    FAILED: string;
  };
}

export function createProcessActionHandler(config: ProcessActionConfig) {
  return async function handleProcessAction(
    req: cds.Request,
    data: EntityRow,
    descriptor: LifecycleAnnotationDescriptor,
  ): Promise<void> {
    const qualifierKey = descriptor.qualifier ?? '';

    // For DELETE: look up pre-fetched data by qualifier
    if (req.event === 'DELETE') {
      data = getPrefetchedDataForDelete(
        req as ProcessDeleteRequest,
        config.action,
        qualifierKey,
        config.logMessages.NOT_TRIGGERED,
      ) as EntityRow;
      if (!data) return;
    } else {
      data = getEntityDataFromRequest(data, req.params) as EntityRow;
    }

    // Get business key column
    const businessKeyColumn = getBusinessKeyColumnOrReject(req, descriptor.businessKey);

    // fetch entity
    const row = await resolveEntityRowOrReject(
      req,
      data,
      descriptor.conditionExpr,
      config.logMessages.FETCH_FAILED,
      config.logMessages.NOT_TRIGGERED,
      [businessKeyColumn],
    );
    if (!row) return;

    // Emit process event
    const payload: ProcessLifecyclePayload = {
      businessKey: (row as { businessKey: string }).businessKey,
      cascade: descriptor.cascade,
    };
    await emitProcessEvent(config.action, req, payload, config.logMessages.FAILED);
  };
}

export async function prefetchLifecycleDataForDelete(
  req: ProcessDeleteRequest,
  annotations: LifecycleAnnotationDescriptor[],
  action: ProcessActionType,
): Promise<EntityRow | void> {
  const resultMap = new Map<string, EntityRow>();

  await Promise.all(
    annotations.map(async (ann) => {
      const qualifierKey = ann.qualifier ?? '';
      const conditionExpr = ann.conditionExpr ? { xpr: ann.conditionExpr } : undefined;
      const where = buildWhereDeleteExpression(req, conditionExpr);
      if (!where) return;

      if (!ann.businessKey) return;
      const businessKeyColumn = formatBusinessKeyColumn(ann.businessKey);

      const entity = await SELECT.one.from(req.subject).columns([businessKeyColumn]).where(where);
      if (entity) {
        resultMap.set(qualifierKey, entity);
      }
    }),
  );

  if (resultMap.size > 0) {
    return { [action]: resultMap };
  }
}
