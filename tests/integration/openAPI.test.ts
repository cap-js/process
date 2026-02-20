import cds from '@sap/cds';
import { getServiceCredentials, getServiceToken } from '../../lib/auth';
import { PROCESS_SERVICE } from '../../lib';

test('should create query request', async () => {
  const processService = await cds.connect.to(PROCESS_SERVICE);
  expect(processService).toBeDefined();
});

test('should get service credentials and token', async () => {
  const credentials = getServiceCredentials(PROCESS_SERVICE);
  if (!credentials) {
    console.log('Skipping test - no SBPA credentials available');
    return;
  }

  const apiUrl = credentials.endpoints.api;
  const token = await getServiceToken(PROCESS_SERVICE);

  expect(apiUrl).toBeDefined();
  expect(token).toBeDefined();
});
