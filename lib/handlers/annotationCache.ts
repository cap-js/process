import cds from '@sap/cds';
import { expr } from '@sap/cds';
import { EntityEventCache, StartAnnotationDescriptor } from '../types/cds-plugin';
import { InputCSNEntry } from '../shared/input-parser';
import {
  PROCESS_START,
  PROCESS_CANCEL_ON,
  PROCESS_SUSPEND_ON,
  PROCESS_RESUME_ON,
  CUD_EVENTS,
} from '../constants';
import { getAnnotationPrefixes } from '../shared/annotations-helper';

function expandEvent(event: string | undefined, entity: cds.entity): string[] {
  if (!event) return [];
  if (event === '*') {
    const boundActions = entity.actions ? Object.keys(entity.actions) : [];
    return [...CUD_EVENTS, ...boundActions];
  }
  return [event];
}

/**
 * Discovers all @bpm.process.start annotations on an entity,
 * including qualified variants like @bpm.process.start#two.
 *
 * CDS compiles:
 *   @bpm.process.start: { id: 'proc1', on: 'CREATE' }
 * into flat keys:
 *   '@bpm.process.start.id': 'proc1'
 *   '@bpm.process.start.on': 'CREATE'
 *
 * A qualified annotation:
 *   @bpm.process.start #two: { id: 'proc2', on: 'UPDATE' }
 * becomes:
 *   '@bpm.process.start#two.id': 'proc2'
 *   '@bpm.process.start#two.on': 'UPDATE'
 */
export function findStartAnnotations(entity: cds.entity): StartAnnotationDescriptor[] {
  const results: StartAnnotationDescriptor[] = [];

  const prefixes = getAnnotationPrefixes(entity, PROCESS_START);

  for (const prefix of prefixes) {
    const id = entity[`${prefix}.id`] as string | undefined;
    const on = entity[`${prefix}.on`] as string | undefined;

    if (!id || !on) continue;

    const qualifier =
      prefix.length > PROCESS_START.length
        ? prefix.substring(PROCESS_START.length + 1) // skip the '#'
        : undefined;

    const ifAnnotation = entity[`${prefix}.if`] as { xpr: expr } | undefined;
    const businessKeyAnnotation = entity[`${prefix}.businessKey`] as { '=': string } | undefined;
    const inputs = entity[`${prefix}.inputs`] as InputCSNEntry[] | undefined;

    results.push({
      qualifier,
      id,
      on,
      conditionExpr: ifAnnotation?.xpr,
      businessKey: businessKeyAnnotation?.['='],
      inputs,
    });
  }

  return results;
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

      // Filter start annotations to those matching this event
      const matchingStarts = startAnnotations.filter((ann) => matchesEvent(ann.on));

      const hasCancel = !!matchesEvent(cancelEvent);
      const hasSuspend = !!matchesEvent(suspendEvent);
      const hasResume = !!matchesEvent(resumeEvent);

      const cacheKey = `${entity.name}:${event}`;
      cache.set(cacheKey, {
        startAnnotations: matchingStarts,
        hasCancel,
        hasSuspend,
        hasResume,
      });
    }
  }
  return cache;
}
