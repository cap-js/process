import * as csn from '../../types/csn-extensions';
import { DataType } from '../api';

export interface ImportOptions {
  name?: string;
  file?: string;
}

export interface SchemaMapContext {
  parentTypeName: string;
  serviceName: string;
  definitions: Record<string, csn.CsnDefinition>;
}

let dataTypeCache = new Map<string, DataType>();

export function getDataTypeCache(): Map<string, DataType> {
  return dataTypeCache;
}

export function resetDataTypeCache(): void {
  dataTypeCache = new Map();
}

export function setDataTypeInCache(uid: string, dataType: DataType): void {
  dataTypeCache.set(uid, dataType);
}
