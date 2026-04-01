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
 * Extracts the qualifier from an annotation prefix.
 * e.g. '@bpm.process.cancel#two' with base '@bpm.process.cancel' returns 'two'.
 * Returns undefined if the prefix has no qualifier (equals the base) or if the
 * separator is not the expected '#' character.
 */
function extractQualifier(prefix: string, annotationBase: string): string | undefined {
  if (prefix.length <= annotationBase.length) return undefined;
  const remainder = prefix.substring(annotationBase.length);
  return remainder.startsWith('#') ? remainder.substring(1) : undefined;
}

/**
 * Resolves the business key expression for a given qualifier.
 * First tries the qualified annotation (e.g. '@bpm.process.businessKey#one'),
 * then falls back to the unqualified '@bpm.process.businessKey'.
 */
function resolveBusinessKey(entity: cds.entity, qualifier: string | undefined): string | undefined {
  if (qualifier) {
    const qualifiedKey = `${BUSINESS_KEY}#${qualifier}`;
    const qualified = (entity[qualifiedKey] as { '=': string } | undefined)?.['='];
    if (qualified) return qualified;
  }
  return (entity[`${BUSINESS_KEY}`] as { '=': string } | undefined)?.['='];
}

/**
 * Resolves the business key annotation key for a given annotation prefix.
 * First checks for a qualified businessKey matching the qualifier of the prefix
 * (e.g. '@bpm.process.businessKey#one' for prefix '@bpm.process.cancel#one'),
 * then falls back to the unqualified '@bpm.process.businessKey'.
 * Returns the annotation key that exists on the entity, or the unqualified key if neither exists.
 */
export function resolveBusinessKeyAnnotation(
  entity: cds.entity | CsnEntity,
  prefix: string,
  annotationBase: string,
): `@${string}` {
  const qualifier = extractQualifier(prefix, annotationBase);
  if (qualifier) {
    const qualifiedKey: `@${string}` = `${BUSINESS_KEY}#${qualifier}`;
    if ((entity as CsnEntity)[qualifiedKey] !== undefined) return qualifiedKey;
  }
  return BUSINESS_KEY;
}

/**
 * Scans all keys on a CDS entity object and returns the unique annotation prefixes
 * that match the given base annotation.
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
