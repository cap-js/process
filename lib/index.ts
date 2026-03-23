export * from './constants';
export * from './handlers';
export * from './build';
export * from './api';
export * from './auth';

import cds, { Results } from '@sap/cds';
import { EntityEventCache } from './types/cds-plugin';
import {
  handleProcessCancel,
  handleProcessResume,
  handleProcessStart,
  handleProcessSuspend,
  registerProcessServiceHandlers,
  buildAnnotationCache,
  EntityRow,
  addDeletedEntityToRequestCancel,
  addDeletedEntityToRequestStart,
  addDeletedEntityToRequestStartBusinessKey,
  addDeletedEntityToRequestResume,
  addDeletedEntityToRequestSuspend,
  ProcessDeleteRequest,
} from './handlers';
import { PROCESS_PREFIX } from './constants';
import { ProcessValidationPlugin } from './build';
import { registerProcessImport } from './processImportRegistration';

// Register build plugin for annotation validation during cds build
cds.build?.register?.('process-validation', ProcessValidationPlugin);

// Register import handler for: cds import --from process
registerProcessImport();

cds.on('serving', async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return;

  const annotationCache = buildAnnotationCache(service);

  service.before('DELETE', async (req: cds.Request) => {
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return;
    const results = await Promise.all(
      [
        cached.hasStart && addDeletedEntityToRequestStart(req),
        cached.hasStart && addDeletedEntityToRequestStartBusinessKey(req),
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
});

async function dispatchProcessHandlers(
  cached: EntityEventCache,
  req: cds.Request,
  data: EntityRow,
) {
  if (cached.hasStart) {
    await handleProcessStart(req, data);
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

cds.on('served', async (services) => {
  const processServices = Object.values(services).filter(
    (service) => service.definition?.[PROCESS_PREFIX],
  );
  for (const service of processServices) {
    registerProcessServiceHandlers(service);
  }
});
