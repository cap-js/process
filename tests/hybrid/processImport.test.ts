import * as fs from 'fs';
import * as path from 'path';
import { importProcess } from '../../lib/processImport';

const NAMESPACE = 'eu12.cdsmunich.capprocesspluginhybridtest';
const IMPORTED_CDS_DIR = path.resolve(__dirname, 'importedCDS');
const EXTERNAL_CDS_DIR = path.resolve(__dirname, '..', 'bookshop', 'srv', 'external');
const WORKFLOWS_DIR = path.resolve(__dirname, '..', 'bookshop', 'srv', 'workflows');
const DOWNLOADED_MODELS_DIR = path.resolve(__dirname, 'downloadedModels');

function readCdsFile(dir: string, processName: string): string {
  const filePath = path.join(dir, `${NAMESPACE}.${processName}.cds`);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('Process Import: imported CDS files match external definitions', () => {
  it('should match for importProcess_Simple_Inputs', () => {
    const imported = readCdsFile(IMPORTED_CDS_DIR, 'importProcess_Simple_Inputs');
    const external = readCdsFile(EXTERNAL_CDS_DIR, 'importProcess_Simple_Inputs');

    expect(imported).toBe(external);
  });

  it('should match for importProcess_Complex_Inputs', () => {
    const imported = readCdsFile(IMPORTED_CDS_DIR, 'importProcess_Complex_Inputs');
    const external = readCdsFile(EXTERNAL_CDS_DIR, 'importProcess_Complex_Inputs');

    expect(imported).toBe(external);
  });

  it('should match for importProcess_Attributes_And_Outputs', () => {
    const imported = readCdsFile(IMPORTED_CDS_DIR, 'importProcess_Attributes_And_Outputs');
    const external = readCdsFile(EXTERNAL_CDS_DIR, 'importProcess_Attributes_And_Outputs');

    expect(imported).toBe(external);
  });
});

describe('Process Import: raw SBPA workflow JSON produces same CSN as ProcessHeader JSON', () => {
  it('should produce identical CSN for importProcess_Simple_Inputs', async () => {
    const rawCsn = await importProcess(
      path.join(DOWNLOADED_MODELS_DIR, 'ImportProcess_Simple_Inputs.json'),
    );
    const headerCsn = await importProcess(
      path.join(WORKFLOWS_DIR, `${NAMESPACE}.importProcess_Simple_Inputs.json`),
    );

    expect(rawCsn).toEqual(headerCsn);
  });

  it('should produce identical CSN for importProcess_Complex_Inputs', async () => {
    const rawCsn = await importProcess(
      path.join(DOWNLOADED_MODELS_DIR, 'ImportProcess_Complex_Inputs.json'),
    );
    const headerCsn = await importProcess(
      path.join(WORKFLOWS_DIR, `${NAMESPACE}.importProcess_Complex_Inputs.json`),
    );

    expect(rawCsn).toEqual(headerCsn);
  });

  it('should produce identical CSN for importProcess_Attributes_And_Outputs', async () => {
    const rawCsn = await importProcess(
      path.join(DOWNLOADED_MODELS_DIR, 'ImportProcess_Attributes_And_Outputs.json'),
    );
    const headerCsn = await importProcess(
      path.join(WORKFLOWS_DIR, `${NAMESPACE}.importProcess_Attributes_And_Outputs.json`),
    );

    expect(rawCsn).toEqual(headerCsn);
  });
});
