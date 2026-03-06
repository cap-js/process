import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import * as csn from '../../types/csn-extensions';
import { ProcessHeader } from '../api';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { setDataTypeInCache } from './types';
import { capitalize } from './utils';
import { addServiceToPackageJson, getModelPathFromFilePath } from './package-json';
import { buildCsnModel } from './csn-builders';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============================================================================
//  GENERATE CSN MODEL
// ============================================================================

export async function generateCsnModel(jsonFilePath: string): Promise<csn.CsnModel> {
  const processHeader = loadProcessHeader(jsonFilePath);
  const csnModel = buildCsnModel(processHeader);

  // Register service in package.json for local imports too
  const serviceName = `${processHeader.projectId}.${capitalize(processHeader.identifier)}Service`;
  const modelPath = getModelPathFromFilePath(jsonFilePath);
  await addServiceToPackageJson(serviceName, modelPath);

  return csnModel;
}

export function loadProcessHeader(filePath: string): ProcessHeader {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const header = JSON.parse(content) as ProcessHeader;

  header.dataTypes?.forEach((dt) => setDataTypeInCache(dt.uid, dt));
  return header;
}
