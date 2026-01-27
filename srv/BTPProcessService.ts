const cds = require('@sap/cds');
// import { start, message, getOutputs, cancel, suspend, resume } from '#cds-models/sap/build/ProcessService'
// import { randomUUID } from 'node:crypto';
// import { getHybridDestination } from '../utils/cloud-sdk-utils';
// import { WorkflowInstancesApi as wfiApi } from '../clients/workflow/workflow-instances-api'
// import { MessagesApi as msgApi } from '../clients/workflow/messages-api'

const BASE_PATH = '/public/workflow/rest'

class ProcessService extends cds.ApplicationService { async init() {
        console.log('Initializing Process Service...')

        // const processAutomationService = await cds.connect.to('process-automation-service') as cds.RemoteService;

        this.on('start', async (request: any) => {
            // const { definitionId, context } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);
            // const workflowInstance = await wfiApi.startInstance({
            //         definitionId: definitionId!,
            //         context: context ? context as Record<string, any> : undefined
            //     }).setBasePath(BASE_PATH).execute(destination);

            const workflowInstance = { id: "1234" }; // Placeholder
            const message = `Process with ID ${workflowInstance.id} was successfully started.`;
            console.log(message);

            return {
                id: workflowInstance.id,
                success: true,
                message: message
            }; 
        });

        return super.init();
}}

module.exports = { ProcessService };
