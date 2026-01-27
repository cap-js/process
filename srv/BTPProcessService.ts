const cds = require('@sap/cds');
const { getCdsProcessService } = require('../utils/cdk-utils');
const { WorkflowInstancesApi } = require('../clients/workflow/workflow-instances-api');
const LOG = cds.log("process");

const BASE_PATH = '/public/workflow/rest'

class ProcessService extends cds.ApplicationService { async init() {
        console.log('Initializing Process Service...')

        const processAutomationService = await cds.connect.to('process-automation-service');

        this.on('start', async (request: any) => {

            const { definitionId, context } = request.data;
    
            const processAutomationService = await cds.connect.to('process-automation-service');
            const dest = await getCdsProcessService(processAutomationService);
            
            const workflowInstance = await WorkflowInstancesApi.startInstance({
                    definitionId: definitionId!,
                    context: context ? context as Record<string, any> : undefined
                }).setBasePath(BASE_PATH).execute(dest);

            const message = `Process with ID ${workflowInstance.id} was successfully started.`;
            

            LOG.info(message);


            return {
                id: workflowInstance.id,
                success: true,
                message: message
            }; 
        });

        return super.init();
}}

module.exports = { ProcessService };
