import cds, { expr } from '@sap/cds';
import { CsnEntity } from '../types/csn-extensions';
import {
  BUSINESS_KEY,
  PROCESS_START,
  SUFFIX_CASCADE,
  SUFFIX_ID,
  SUFFIX_IF,
  SUFFIX_INPUTS,
  SUFFIX_ON,
} from '../constants';
import { LifecycleAnnotationDescriptor, StartAnnotationDescriptor } from '../types/cds-plugin';
import { InputCSNEntry } from './input-parser';

/**
 * Scans all keys on a CDS entity object and returns the unique annotation prefixes
 * that match the given base annotation.
 *
 * CDS compiles annotations into flat keys on the entity object. For example:
 *   '@bpm.process.start.id': 'proc1'
 *   '@bpm.process.start.on': 'CREATE'
 *   '@bpm.process.start#two.id': 'proc2'
 *   '@bpm.process.start#two.on': 'UPDATE'
 *
 * Given annotationBase '@bpm.process.start', this returns:
 *   Set { '@bpm.process.start', '@bpm.process.start#two' }
 *
 * The returned prefixes can then be combined with property suffixes (e.g. '.id', '.on')
 * to read individual annotation values, and passed to extractQualifier() to get the
 * qualifier name (if any).
 */
export function getAnnotationPrefixes(entity: cds.entity | CsnEntity, annotationBase: string) {
  const prefixes = new Set<string>();
  for (const key of Object.keys(entity)) {
    if (!key.startsWith(annotationBase)) continue;
    const dotIndex = key.indexOf('.', annotationBase.length);
    if (dotIndex === -1) continue;
    prefixes.add(key.substring(0, dotIndex));
  }

  return prefixes;
}

/**
 * Extracts the qualifier from an annotation prefix.
 * e.g. '@bpm.process.cancel#two' with base '@bpm.process.cancel' returns 'two'.
 * Returns undefined if the prefix has no qualifier (equals the base) or if the
 * separator is not the expected '#' character.
 */
export function extractQualifier(prefix: string, annotationBase: string): string | undefined {
  if (prefix.length <= annotationBase.length) return undefined;
  const remainder = prefix.substring(annotationBase.length);
  return remainder.startsWith('#') ? remainder.substring(1) : undefined;
}

/**
 * Resolves which business key annotation key applies for a given qualifier.
 * For qualified: tries '@bpm.process.businessKey#qualifier' first on the entity,
 * then falls back to '@bpm.process.businessKey'.
 * For unqualified: returns '@bpm.process.businessKey' directly.
 *
 * Works with both runtime cds.entity and build-time CsnEntity objects.
 */
export function resolveBusinessKeyAnnotation(
  entity: cds.entity | CsnEntity,
  qualifier: string | undefined,
): `@${string}` {
  if (qualifier) {
    const qualifiedKey = `${BUSINESS_KEY}#${qualifier}` as `@${string}`;
    if ((entity as CsnEntity)[qualifiedKey] !== undefined) return qualifiedKey;
  }
  return BUSINESS_KEY;
}

/**
 * Resolves the business key expression value for a given qualifier.
 * For qualified annotations: tries @bpm.process.businessKey#qualifier first,
 * then falls back to unqualified @bpm.process.businessKey.
 * For unqualified annotations: uses @bpm.process.businessKey directly.
 */
export function resolveBusinessKey(
  entity: cds.entity,
  qualifier: string | undefined,
): string | undefined {
  const key = resolveBusinessKeyAnnotation(entity, qualifier);
  const expr = entity[key] as { '=': string } | undefined;
  return expr?.['='];
}

export function findStartAnnotations(entity: cds.entity): StartAnnotationDescriptor[] {
  const results: StartAnnotationDescriptor[] = [];

  const prefixes = getAnnotationPrefixes(entity, PROCESS_START);

  for (const prefix of prefixes) {
    const id = entity[`${prefix}${SUFFIX_ID}`] as string | undefined;
    const on = entity[`${prefix}${SUFFIX_ON}`] as string | undefined;

    if (!id || !on) continue;

    const qualifier = extractQualifier(prefix, PROCESS_START);

    const ifAnnotation = entity[`${prefix}${SUFFIX_IF}`] as { xpr: expr } | undefined;
    const inputs = entity[`${prefix}${SUFFIX_INPUTS}`] as InputCSNEntry[] | undefined;

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

export function findLifecycleAnnotations(
  entity: cds.entity,
  annotationBase: string,
): LifecycleAnnotationDescriptor[] {
  const results: LifecycleAnnotationDescriptor[] = [];

  const prefixes = getAnnotationPrefixes(entity, annotationBase);

  for (const prefix of prefixes) {
    const on = entity[`${prefix}${SUFFIX_ON}`] as string | undefined;
    if (!on) continue;

    const qualifier = extractQualifier(prefix, annotationBase);

    const cascade = (entity[`${prefix}${SUFFIX_CASCADE}`] as boolean) ?? false;
    const ifAnnotation = entity[`${prefix}${SUFFIX_IF}`] as { xpr: expr } | undefined;
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
