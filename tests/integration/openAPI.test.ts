const cds = require('@sap/cds');
const { getCdsProcessService } = require('../utils/cdk-utils');
import { WorkflowInstancesApi } from '../../clients/workflow';


test('should create query request', () => {
  const request = WorkflowInstancesApi.queryInstances({
    status: 'RUNNING'
  });

  expect(request).toBeDefined();
});

test('should execute query', async () => {
    const BASE_PATH = 'public/workflow/rest'
   
    // connect to process-automation-service with 'hybrid' defined int cdsrc-private.json
    const processAutomationService = await cds.connect.to('process-automation-service');
    const dest = await getCdsProcessService(processAutomationService);

    const result = await WorkflowInstancesApi
        .queryInstances({ status: 'RUNNING' })
        .setBasePath(BASE_PATH)
        .execute(dest);

    expect(Array.isArray(result)).toBe(true);
});
