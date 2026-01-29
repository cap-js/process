const cds = require('@sap/cds');
const { getAuth } = require('../../utils/cdk-utils');

test('should create query request', async () => {
    const workflowService = await cds.connect.to('Workflow');
    expect(workflowService).toBeDefined();
});

test('should execute query', async () => {
    const workflowService = await cds.connect.to('Workflow');
    const processAutomationService = await cds.connect.to('process-automation-service') as typeof cds.RemoteService;
    const authToken = await getAuth(processAutomationService);

    const result = await workflowService.send({
        method: 'GET',
        path: '/v1/workflow-instances',
        headers: {
            'Authorization': authToken
        },
        params: {
            status: 'RUNNING'
        }
    });
    console.log(result);

    expect(Array.isArray(result)).toBe(true);
});
