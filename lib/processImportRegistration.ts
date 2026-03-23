import cds from '@sap/cds';
import { importProcess } from './processImport';

export function registerProcessImport() {
  // @ts-expect-error: import does not exist on cds type
  cds.import ??= {};
  // @ts-expect-error: cds type does not exist
  cds.import.options ??= {};
  // @ts-expect-error: cds type does not exist
  cds.import.options.process = { no_copy: true, as: 'cds', config: 'kind=process-service' };
  // @ts-expect-error: process does not exist on cds.import type
  cds.import.from ??= {};
  // @ts-expect-error: from does not exist on cds.import type
  cds.import.from.process = importProcess;
}
