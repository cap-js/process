export * from './constants';
export * from './handlers';
export * from './build';
export * from './api';
export * from './auth';

import cds from '@sap/cds';
import { registerProcessServiceHandlers, registerAnnotationHandlers } from './handlers';
import { PROCESS_PREFIX } from './constants';
import { ProcessValidationPlugin } from './build';
import { registerProcessImport } from './processImportRegistration';

// Register build plugin for annotation validation during cds build
cds.build?.register?.('process-validation', ProcessValidationPlugin);

// Register import handler for: cds import --from process
registerProcessImport();

cds.on('serving', async (service: cds.Service) => {
  registerAnnotationHandlers(service);
});

cds.on('served', async (services) => {
  const processServices = Object.values(services).filter(
    (service) => service.definition?.[PROCESS_PREFIX],
  );
  for (const service of processServices) {
    registerProcessServiceHandlers(service);
  }
});
