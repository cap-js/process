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
 * Resolves the business key expression for a given qualifier.
 * For qualified annotations: tries @bpm.process.businessKey#qualifier first,
 * then falls back to unqualified @bpm.process.businessKey.
 * For unqualified annotations: uses @bpm.process.businessKey directly.
 */
export function resolveBusinessKey(
  entity: cds.entity,
  qualifier: string | undefined,
): string | undefined {
  if (qualifier) {
    const qualified = entity[`${BUSINESS_KEY}#${qualifier}`] as { '=': string } | undefined;
    if (qualified) return qualified['='];
  }
  const unqualified = entity[BUSINESS_KEY] as { '=': string } | undefined;
  return unqualified?.['='];
}
