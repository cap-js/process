import cds from '@sap/cds';
import { CsnEntity } from '../types/csn-extensions';

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
