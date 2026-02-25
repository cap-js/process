import cds, { Results, Target } from '@sap/cds';
import {
  addDeletedEntityToRequest,
  handleProcessCancel,
  handleProcessResume,
  handleProcessStart,
  handleProcessSuspend,
  ProcessValidationPlugin,
  registerProcessServiceHandlers,
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_CANCEL_ON,
  PROCESS_SUSPEND_ON,
  PROCESS_RESUME_ON,
  PROCESS_PREFIX,
} from './lib/index';
import { importProcess } from './lib/processImport';

interface EntityEventCache {
  hasStart: boolean;
  hasCancel: boolean;
  hasSuspend: boolean;
  hasResume: boolean;
}

// Register build plugin for annotation validation during cds build
cds.build?.register?.('process-validation', ProcessValidationPlugin);

// Register import handler for: cds import --from process
// @ts-expect-error: import does not exist on cds type
cds.import ??= {};
// @ts-expect-error: process does not exist on cds.import type
cds.import.from ??= {};
// @ts-expect-error: from does not exist on cds.import type
cds.import.from.process = importProcess;

cds.on('serving', async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return;

  // cache for entities
  const annotationCache = buildeAnnotationCache(service);

  service.before('DELETE', async (req: cds.Request) => {
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return; // Fast exit - no annotations
    if (cached.hasCancel || cached.hasSuspend || cached.hasStart || cached.hasResume) {
      await addDeletedEntityToRequest(req, cached.hasStart);
    }
  });

  service.after('*', async (each: Results, req: cds.Request) => {
    if (!req.target) return;
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return; // Fast exit - no annotations

    if (cached.hasStart) await handleProcessStart(req);
    if (cached.hasCancel) await handleProcessCancel(req);
    if (cached.hasSuspend) await handleProcessSuspend(req);
    if (cached.hasResume) await handleProcessResume(req);
  });
});

function buildeAnnotationCache(service: cds.Service) {
  const cache = new Map<string, EntityEventCache>();
  for (const entity of Object.values(service.entities)) {
    const events = ['UPDATE', 'CREATE', 'DELETE'];
    for (const event of events) {
      const hasStart = !!(entity[PROCESS_START_ON] === event && entity[PROCESS_START_ID]);
      const hasCancel = !!(entity[PROCESS_CANCEL_ON] && entity[PROCESS_CANCEL_ON] === event);
      const hasSuspend = !!(entity[PROCESS_SUSPEND_ON] && entity[PROCESS_SUSPEND_ON] === event);
      const hasResume = !!(entity[PROCESS_RESUME_ON] && entity[PROCESS_RESUME_ON] === event);
      if (hasStart || hasCancel || hasSuspend || hasResume) {
        cache.set(`${entity.name}:${event}`, {
          hasStart,
          hasCancel,
          hasSuspend,
          hasResume,
        });
      }
    }
  }
  return cache;
}

cds.on('served', async (services) => {
  const processServices = Object.values(services).filter(
    (service) => service.definition?.[PROCESS_PREFIX],
  );
  for (const service of processServices) {
    registerProcessServiceHandlers(service);
  }
});
