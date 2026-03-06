import * as csn from '../../types/csn-extensions';
import { ImportOptions, resetDataTypeCache } from './types';
import { fetchAndSaveProcessDefinition } from './api-client';
import { generateCsnModel } from './csn-model';
import { buildCsnModel } from './csn-builders';

// ============================================================================
//  MAIN ENTRY POINT
// ============================================================================

export async function importProcess(
  jsonFile: string,
  options: ImportOptions = {},
): Promise<csn.CsnModel> {
  resetDataTypeCache();

  if (options.name) {
    const { filePath, processHeader } = await fetchAndSaveProcessDefinition(options.name);
    options.file = filePath;
    return buildCsnModel(processHeader);
  }
  return generateCsnModel(jsonFile);
}

// Re-export types that may be needed externally
export type { ImportOptions } from './types';
