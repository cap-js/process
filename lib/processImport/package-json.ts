import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============================================================================
//  PACKAGE.JSON UPDATE
// ============================================================================

export async function addServiceToPackageJson(
  serviceName: string,
  modelPath: string,
): Promise<void> {
  const packagePath = path.join(cds.root, 'package.json');

  try {
    const content = await fs.promises.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(content);

    pkg.cds ??= {};
    pkg.cds.requires ??= {};
    pkg.cds.requires[serviceName] = { kind: 'external', model: modelPath };

    await fs.promises.writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    LOG.debug(`Added ${serviceName} to package.json`);
  } catch (error) {
    LOG.warn(`Could not update package.json: ${error}`);
  }
}

/**
 * Convert absolute/relative file path to model path for package.json
 * e.g., "./srv/external/foo.json" -> "srv/external/foo"
 *       "/abs/path/srv/external/foo.json" -> "srv/external/foo"
 */
export function getModelPathFromFilePath(filePath: string): string {
  // Resolve to absolute, then make relative to cds.root
  const absolutePath = path.resolve(filePath);
  let relativePath = path.relative(cds.root, absolutePath);

  // Remove .json extension
  if (relativePath.endsWith('.json')) {
    relativePath = relativePath.slice(0, -5);
  }

  // Normalize path separators
  relativePath = relativePath.replace(/\\/g, '/');

  // Replace "workflows" prefix with "srv/external"
  if (relativePath.startsWith('workflows/')) {
    relativePath = 'srv/external/' + relativePath.slice('workflows/'.length);
  }

  return relativePath;
}
