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
import { prefetchLifecycleDataForDelete } from './processActionHandler';

export function registerAnnotationHandlers(service: cds.Service) {
  if (service instanceof cds.ApplicationService == false) return;

  const annotationCache = buildAnnotationCache(service);

  service.before('DELETE', async (req: cds.Request) => {
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return;
    const hasStart = cached.startAnnotations.length > 0;
    const hasCancels = cached.cancelAnnotations.length > 0;
    const hasSuspends = cached.suspendAnnotations.length > 0;
    const hasResumes = cached.resumeAnnotations.length > 0;

    const results = await Promise.all(
      [
        hasStart && prefetchStartDataForDelete(req, cached.startAnnotations),
        hasCancels && prefetchLifecycleDataForDelete(req, cached.cancelAnnotations, 'cancel'),
        hasSuspends && prefetchLifecycleDataForDelete(req, cached.suspendAnnotations, 'suspend'),
        hasResumes && prefetchLifecycleDataForDelete(req, cached.resumeAnnotations, 'resume'),
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
  await Promise.all(
    cached.startAnnotations.map((startAnn) => handleProcessStart(req, data, startAnn)),
  );

  await Promise.all(
    cached.cancelAnnotations.map((cancelAnn) => handleProcessCancel(req, data, cancelAnn)),
  );

  await Promise.all(
    cached.suspendAnnotations.map((suspendAnn) => handleProcessSuspend(req, data, suspendAnn)),
  );

  await Promise.all(
    cached.resumeAnnotations.map((resumeAnn) => handleProcessResume(req, data, resumeAnn)),
  );
}
