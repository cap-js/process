import cds, { Results } from '@sap/cds';
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

const CUD_EVENTS = ['CREATE', 'UPDATE', 'DELETE'];

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

  const annotationCache = buildAnnotationCache(service);

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

    if (cached.hasStart) {
      await handleProcessStart(req);
    }
    if (cached.hasCancel) {
      await handleProcessCancel(req);
    }
    if (cached.hasSuspend) {
      await handleProcessSuspend(req);
    }
    if (cached.hasResume) {
      await handleProcessResume(req);
    }
  });
});

function expandEvent(event: string | undefined, entity: cds.entity): string[] {
  if (!event) return [];
  if (event === '*') {
    const boundActions = entity.actions ? Object.keys(entity.actions) : [];
    return [...CUD_EVENTS, ...boundActions];
  }
  return [event];
}

function buildAnnotationCache(service: cds.Service) {
  const cache = new Map<string, EntityEventCache>();
  for (const entity of Object.values(service.entities)) {
    const startEvent = entity[PROCESS_START_ON];
    const cancelEvent = entity[PROCESS_CANCEL_ON];
    const suspendEvent = entity[PROCESS_SUSPEND_ON];
    const resumeEvent = entity[PROCESS_RESUME_ON];

    const events = new Set<string>();
    for (const ev of expandEvent(startEvent, entity)) events.add(ev);
    for (const ev of expandEvent(cancelEvent, entity)) events.add(ev);
    for (const ev of expandEvent(suspendEvent, entity)) events.add(ev);
    for (const ev of expandEvent(resumeEvent, entity)) events.add(ev);

    for (const event of events) {
      const matchesEvent = (annotationEvent: string | undefined) =>
        annotationEvent === event || annotationEvent === '*';

      const hasStart = !!(matchesEvent(startEvent) && entity[PROCESS_START_ID]);
      const hasCancel = !!matchesEvent(cancelEvent);
      const hasSuspend = !!matchesEvent(suspendEvent);
      const hasResume = !!matchesEvent(resumeEvent);

      const cacheKey = `${entity.name}:${event}`;
      cache.set(cacheKey, {
        hasStart,
        hasCancel,
        hasSuspend,
        hasResume,
      });
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
