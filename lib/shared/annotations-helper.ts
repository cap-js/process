import cds from '@sap/cds';
import { CsnEntity } from '../types/csn-extensions';
import { BUSINESS_KEY } from '../constants';

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
 * Returns undefined if the prefix has no qualifier (equals the base).
 */
export function extractQualifier(prefix: string, annotationBase: string): string | undefined {
  return prefix.length > annotationBase.length
    ? prefix.substring(annotationBase.length + 1) // skip the '#'
    : undefined;
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
