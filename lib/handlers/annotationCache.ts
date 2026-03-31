import cds from '@sap/cds';
import { expr } from '@sap/cds';
import {
  EntityEventCache,
  StartAnnotationDescriptor,
  LifecycleAnnotationDescriptor,
} from '../types/cds-plugin';
import { InputCSNEntry } from '../shared/input-parser';
import {
  PROCESS_START,
  PROCESS_CANCEL,
  PROCESS_SUSPEND,
  PROCESS_RESUME,
  CUD_EVENTS,
} from '../constants';
import { extractQualifier, getAnnotationPrefixes, resolveBusinessKey } from '../shared/annotations-helper';

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

    const qualifier = extractQualifier(prefix, PROCESS_START);

    const ifAnnotation = entity[`${prefix}.if`] as { xpr: expr } | undefined;
    const inputs = entity[`${prefix}.inputs`] as InputCSNEntry[] | undefined;

    const businessKey = resolveBusinessKey(entity, qualifier);

    results.push({
      qualifier,
      id,
      on,
      conditionExpr: ifAnnotation?.xpr,
      businessKey: businessKey,
      inputs,
    });
  }

  return results;
}

/**
 * Discovers all lifecycle annotations (cancel, suspend, or resume) on an entity,
 * including qualified variants like @bpm.process.cancel#two.
 *
 * CDS compiles:
 *   @bpm.process.cancel: { on: 'DELETE', cascade: true }
 * into flat keys:
 *   '@bpm.process.cancel.on': 'DELETE'
 *   '@bpm.process.cancel.cascade': true
 *
 * A qualified annotation:
 *   @bpm.process.cancel #two: { on: 'UPDATE', cascade: false }
 * becomes:
 *   '@bpm.process.cancel#two.on': 'UPDATE'
 *   '@bpm.process.cancel#two.cascade': false
 */
export function findLifecycleAnnotations(
  entity: cds.entity,
  annotationBase: string,
): LifecycleAnnotationDescriptor[] {
  const results: LifecycleAnnotationDescriptor[] = [];

  const prefixes = getAnnotationPrefixes(entity, annotationBase);

  for (const prefix of prefixes) {
    const on = entity[`${prefix}.on`] as string | undefined;
    if (!on) continue;

    const qualifier = extractQualifier(prefix, annotationBase);

    const cascade = (entity[`${prefix}.cascade`] as boolean) ?? false;
    const ifAnnotation = entity[`${prefix}.if`] as { xpr: expr } | undefined;
    const businessKey = resolveBusinessKey(entity, qualifier);

    results.push({
      qualifier,
      on,
      cascade,
      conditionExpr: ifAnnotation?.xpr,
      businessKey,
    });
  }

  return results;
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
