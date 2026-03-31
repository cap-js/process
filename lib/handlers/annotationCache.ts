import cds from '@sap/cds';
import { EntityEventCache } from '../types/cds-plugin';
import { CUD_EVENTS, PROCESS_CANCEL_ON, PROCESS_SUSPEND_ON, PROCESS_RESUME_ON } from '../constants';
import { findStartAnnotations } from '../shared/annotations-helper';

function expandEvent(event: string | undefined, entity: cds.entity): string[] {
  if (!event) return [];
  if (event === '*') {
    const boundActions = entity.actions ? Object.keys(entity.actions) : [];
    return [...CUD_EVENTS, ...boundActions];
  }
  return [event];
}

export function buildAnnotationCache(service: cds.Service) {
  const cache = new Map<string, EntityEventCache>();
  for (const entity of Object.values(service.entities)) {
    const startAnnotations = findStartAnnotations(entity);
    const cancelEvent = entity[PROCESS_CANCEL_ON];
    const suspendEvent = entity[PROCESS_SUSPEND_ON];
    const resumeEvent = entity[PROCESS_RESUME_ON];

    const events = new Set<string>();
    for (const ann of startAnnotations) {
      for (const ev of expandEvent(ann.on, entity)) events.add(ev);
    }
    for (const ev of expandEvent(cancelEvent, entity)) events.add(ev);
    for (const ev of expandEvent(suspendEvent, entity)) events.add(ev);
    for (const ev of expandEvent(resumeEvent, entity)) events.add(ev);

    for (const event of events) {
      const matchesEvent = (annotationEvent: string | undefined) =>
        annotationEvent === event || annotationEvent === '*';

      // Filter annotations to those matching this event
      const matchingStarts = startAnnotations.filter((ann) => matchesEvent(ann.on));
      const hasCancel = !!matchesEvent(cancelEvent);
      const hasSuspend = !!matchesEvent(suspendEvent);
      const hasResume = !!matchesEvent(resumeEvent);

      const cacheKey = `${entity.name}:${event}`;
      cache.set(cacheKey, {
        startAnnotations: matchingStarts,
        hasCancel: hasCancel,
        hasSuspend: hasSuspend,
        hasResume: hasResume,
      });
    }
  }
  return cache;
}
