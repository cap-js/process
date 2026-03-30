import cds from '@sap/cds';
import { Results } from '@sap/cds';
import {
  emitProcessEvent,
  EntityRow,
  getEntityDataFromRequest,
  ProcessLifecyclePayload,
  resolveEntityRowOrReject,
} from './utils';
import { buildWhereDeleteExpression, ProcessDeleteRequest } from './onDeleteUtils';
import {
  formatBusinessKeyColumn,
  getBusinessKeyColumnOrReject,
} from '../shared/businessKey-helper';
import { LifecycleAnnotationDescriptor } from '../types/cds-plugin';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export type ProcessActionType = 'cancel' | 'resume' | 'suspend';

type DeleteProcessMapKey = 'Cancel' | 'Suspend' | 'Resume';

const ACTION_TO_DELETE_KEY: Record<ProcessActionType, DeleteProcessMapKey> = {
  cancel: 'Cancel',
  suspend: 'Suspend',
  resume: 'Resume',
};

export interface ProcessActionConfig {
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
  const deleteKey = ACTION_TO_DELETE_KEY[config.action];

  return async function handleProcessAction(
    req: cds.Request,
    data: EntityRow,
    descriptor: LifecycleAnnotationDescriptor,
  ): Promise<void> {
    const qualifierKey = descriptor.qualifier ?? '';

    // For DELETE: look up pre-fetched data by qualifier
    if (req.event === 'DELETE') {
      const prefetchMap = (req as ProcessDeleteRequest)._Process?.[deleteKey] as
        | Map<string, Results>
        | undefined;
      const prefetched = prefetchMap?.get(qualifierKey) as EntityRow | undefined;
      if (!prefetched) {
        LOG.debug(config.logMessages.NOT_TRIGGERED);
        return;
      }
      data = prefetched;
    } else {
      data = getEntityDataFromRequest(data, req.params) as EntityRow;
    }

    // Get business key column
    const businessKeyColumn = getBusinessKeyColumnOrReject(req, descriptor.businessKey);
    if (!businessKeyColumn) return;

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

/**
 * Pre-fetches entity data for all lifecycle annotations (cancel/suspend/resume) before DELETE.
 * Returns a partial _Process object with a Map keyed by qualifier ('' for unqualified).
 *
 * Each annotation may have a different condition and business key,
 * so we issue separate SELECTs per annotation.
 */
export async function prefetchLifecycleDataForDelete(
  req: cds.Request,
  annotations: LifecycleAnnotationDescriptor[],
  action: ProcessActionType,
): Promise<EntityRow | void> {
  const deleteKey = ACTION_TO_DELETE_KEY[action];
  const deleteReq = req as ProcessDeleteRequest;

  const resultMap = new Map<string, EntityRow>();

  await Promise.all(
    annotations.map(async (ann) => {
      const qualifierKey = ann.qualifier ?? '';
      const conditionExpr = ann.conditionExpr ? { xpr: ann.conditionExpr } : undefined;
      const where = buildWhereDeleteExpression(deleteReq, conditionExpr);
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
    return { [deleteKey]: resultMap };
  }
}
