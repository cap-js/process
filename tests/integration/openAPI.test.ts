const cds = require('@sap/cds');
const {getAuth } = require('../../utils/cdk-utils');


test('should create query request', async () => {
    const WorkflowInstancesApi = await cds.connect.to('Workflow');
    const request = WorkflowInstancesApi.queryInstances({
    status: 'RUNNING'
  });

  expect(request).toBeDefined();
});

test('should execute query', async () => {
    const BASE_PATH = 'public/workflow/rest'
    const WorkflowInstancesApi = cds.connect.to('Workflow');
    const processAutomationService = await cds.connect.to('process-automation-service');
    const dest = await getAuth(processAutomationService);
    

    const result = await WorkflowInstancesApi
        .queryInstances({ status: 'RUNNING' })
        .setBasePath(BASE_PATH)
        .execute(dest);

    expect(Array.isArray(result)).toBe(true);
});
