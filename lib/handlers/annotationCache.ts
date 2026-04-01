import cds from '@sap/cds';
import { EntityEventCache } from '../types/cds-plugin';
import { CUD_EVENTS, PROCESS_CANCEL, PROCESS_RESUME, PROCESS_SUSPEND } from '../constants';
import { findLifecycleAnnotations, findStartAnnotations } from '../shared/annotations-helper';

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
    const cancelAnnotations = findLifecycleAnnotations(entity, PROCESS_CANCEL);
    const suspendAnnotations = findLifecycleAnnotations(entity, PROCESS_SUSPEND);
    const resumeAnnotations = findLifecycleAnnotations(entity, PROCESS_RESUME);

    const events = new Set<string>();
    for (const ann of startAnnotations) {
      for (const ev of expandEvent(ann.on, entity)) events.add(ev);
    }
    for (const ann of cancelAnnotations) {
      for (const ev of expandEvent(ann.on, entity)) events.add(ev);
    }
    for (const ann of suspendAnnotations) {
      for (const ev of expandEvent(ann.on, entity)) events.add(ev);
    }
    for (const ann of resumeAnnotations) {
      for (const ev of expandEvent(ann.on, entity)) events.add(ev);
    }

    for (const event of events) {
      const matchesEvent = (annotationEvent: string | undefined) =>
        annotationEvent === event || annotationEvent === '*';

      // Filter annotations to those matching this event
      const matchingStarts = startAnnotations.filter((ann) => matchesEvent(ann.on));
      const matchingCancels = cancelAnnotations.filter((ann) => matchesEvent(ann.on));
      const matchingSuspends = suspendAnnotations.filter((ann) => matchesEvent(ann.on));
      const matchingResumes = resumeAnnotations.filter((ann) => matchesEvent(ann.on));

      const cacheKey = `${entity.name}:${event}`;
      cache.set(cacheKey, {
        startAnnotations: matchingStarts,
        cancelAnnotations: matchingCancels,
        suspendAnnotations: matchingSuspends,
        resumeAnnotations: matchingResumes,
      });
    }
  }
  return cache;
}
