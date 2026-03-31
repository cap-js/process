import cds, { Results } from '@sap/cds';
import { EntityEventCache } from '../types/cds-plugin';
import {
  handleProcessCancel,
  handleProcessResume,
  handleProcessStart,
  handleProcessSuspend,
  buildAnnotationCache,
  EntityRow,
  prefetchStartDataForDelete,
  ProcessDeleteRequest,
} from '../handlers';
import { addDeletedEntityToRequestCancel } from './processCancel';
import { addDeletedEntityToRequestResume } from './processResume';
import { addDeletedEntityToRequestSuspend } from './processSuspend';

export function registerAnnotationHandlers(service: cds.Service) {
  if (service instanceof cds.ApplicationService == false) return;

  const annotationCache = buildAnnotationCache(service);

  service.before('DELETE', async (req: cds.Request) => {
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return;
    const hasStart = cached.startAnnotations.length > 0;

    const results = await Promise.all(
      [
        hasStart && prefetchStartDataForDelete(req, cached.startAnnotations),
        cached.hasCancel && addDeletedEntityToRequestCancel(req),
        cached.hasResume && addDeletedEntityToRequestResume(req),
        cached.hasSuspend && addDeletedEntityToRequestSuspend(req),
      ].filter(Boolean),
    );
    (req as ProcessDeleteRequest)._Process = Object.assign({}, ...results);
  });

  service.after('*', async (results: Results, req: cds.Request) => {
    if (!req.target) return;
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return;

    const rows: EntityRow[] = Array.isArray(results) ? results : [results];
    if (rows.length > 0) {
      await Promise.all(rows.map((row) => dispatchProcessHandlers(cached, req, row)));
    } else {
      await dispatchProcessHandlers(cached, req, req.data);
    }
  });
}

async function dispatchProcessHandlers(
  cached: EntityEventCache,
  req: cds.Request,
  data: EntityRow,
) {
  const hasStart = cached.startAnnotations.length > 0;

  if (hasStart) {
    await Promise.all(
      cached.startAnnotations.map((startAnn) => handleProcessStart(req, data, startAnn)),
    );
  }
  if (cached.hasCancel) {
    await handleProcessCancel(req, data);
  }
  if (cached.hasSuspend) {
    await handleProcessSuspend(req, data);
  }
  if (cached.hasResume) {
    await handleProcessResume(req, data);
  }
}
