import * as fs from 'fs';
import * as path from 'path';

const NAMESPACE = 'eu12.cdsmunich.capprocesspluginhybridtest';
const IMPORTED_CDS_DIR = path.resolve(__dirname, 'importedCDS');
const EXTERNAL_CDS_DIR = path.resolve(__dirname, '..', 'bookshop', 'srv', 'external');

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
