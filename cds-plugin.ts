import cds, { Results } from '@sap/cds';
import { EntityEventCache } from './types/cds-plugin';
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
  CUD_EVENTS,
  EntityRow,
  PROCESS_START_QUALIFIER_PREFIX,
  PROCESS_START_QUALIFIER_PATTERN,
} from './lib/index';
import { importProcess } from './lib/processImport';

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

  service.after('*', async (results: Results, req: cds.Request) => {
    if (!req.target) return;
    const cacheKey = `${req.target.name}:${req.event}`;
    const cached = annotationCache.get(cacheKey);

    if (!cached) return; // Fast exit - no annotations

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
    const cancelEvent = entity[PROCESS_CANCEL_ON] as string | undefined;
    const suspendEvent = entity[PROCESS_SUSPEND_ON] as string | undefined;
    const resumeEvent = entity[PROCESS_RESUME_ON] as string | undefined;

    // Collect all events that have a start annotation (non-qualified and qualified)
    const startEventsSet = new Set<string>();

    // Non-qualified: @bpm.process.start: { id, on }
    const nonQualStartOn = entity[PROCESS_START_ON] as string | undefined;
    if (nonQualStartOn && entity[PROCESS_START_ID]) {
      for (const ev of expandEvent(nonQualStartOn, entity)) startEventsSet.add(ev);
    }

    // Qualified: @bpm.process.start #qualifier: { id, on }
    // CDS stores as @bpm.process.start#qualifier.on, @bpm.process.start#qualifier.id
    for (const key of Object.keys(entity)) {
      const match = key.match(PROCESS_START_QUALIFIER_PATTERN);
      if (match) {
        const qualifier = match[1];
        const onValue = entity[key as keyof typeof entity] as string | undefined;
        const hasId = !!(entity[`${PROCESS_START_QUALIFIER_PREFIX}${qualifier}.id` as keyof typeof entity]);
        if (onValue && hasId) {
          for (const ev of expandEvent(onValue, entity)) startEventsSet.add(ev);
        }
      }
    }

    // Collect unique events across all annotation types
    const events = new Set<string>([...startEventsSet]);
    for (const ev of expandEvent(cancelEvent, entity)) events.add(ev);
    for (const ev of expandEvent(suspendEvent, entity)) events.add(ev);
    for (const ev of expandEvent(resumeEvent, entity)) events.add(ev);

    for (const event of events) {
      const matchesEvent = (annotationEvent: string | undefined) =>
        annotationEvent === event || annotationEvent === '*';

      const hasStart = startEventsSet.has(event);
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
