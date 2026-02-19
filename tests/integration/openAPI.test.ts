import cds from '@sap/cds';
import { getServiceCredentials, getServiceToken } from '../../lib/auth';

const PROCESS_SERVICE = 'ProcessService';

test('should create query request', async () => {
    const processService = await cds.connect.to('ProcessService');
    expect(processService).toBeDefined();
});

test('should execute query', async () => {
    const credentials = await getServiceCredentials(PROCESS_SERVICE);
    const srvUrl = credentials?.endpoints.api;
    const token = await getServiceToken(PROCESS_SERVICE);

    expect(srvUrl).toBeDefined();
    expect(token).toBeDefined();

    const response = await fetch(`${srvUrl}/public/workflow/rest/v1/workflow-instances`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token.jwt}`
        }
    });

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
});