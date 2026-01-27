const cds = require('@sap/cds');
// import { start, message, getOutputs, cancel, suspend, resume } from '#cds-models/sap/build/ProcessService'
// import { randomUUID } from 'node:crypto';
// import { getHybridDestination } from '../utils/cloud-sdk-utils';
// import { WorkflowInstancesApi as wfiApi } from '../clients/workflow/workflow-instances-api'
// import { MessagesApi as msgApi } from '../clients/workflow/messages-api'

const BASE_PATH = '/public/workflow/rest'

class BTPProcessService extends cds.ApplicationService { async init() {
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

        this.on('message', async (request: any) => {
            // const { id, messageDefinitionId, context } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);
            // await msgApi.sendMessage({
            //     definitionId: messageDefinitionId,
            //     workflowInstanceId: id,
            //     context: context ? context as Record<string, any> : undefined
            // }).setBasePath(BASE_PATH).execute(destination);

            const message = `Process with ID was successfully messaged.`;
            console.log(message);

            return {
                success: true,
                message: message
            };
        });

        this.on('getOutputs', async (request: any) => {
            // const { id } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);

            // // TODO: call actuall outputs API once we are able to properly generate the API client based on the SBPA OpenAPI files
            // const result = await wfiApi.getInstanceContext(id).setBasePath('/public/workflow/rest').execute(destination); 

            // const message = `Outputs for process with ID ${id} were successfully retrieved.`;
            // console.log(message);

            const result = {}; // Placeholder

            return {
                outputs: JSON.stringify(result)
            };
        });

        this.on('cancel', async (request: any) => {
            // const { id, cascade } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);
            // const result = await wfiApi.updateInstance(id, {
            //     cascade: cascade || undefined,
            //     status: 'CANCELED'
            // }).setBasePath(BASE_PATH).execute(destination);

            const message = `Process with ID was successfully canceled.`;
            console.log(message);

            return {
                success: true,
                message: message
            };
        });

        this.on('suspend', async (request: any) => {
            // const { id } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);
            // const result = await wfiApi.updateInstance(id, {
            //     status: 'SUSPENDED'
            // }).setBasePath(BASE_PATH).execute(destination);

            const message = `Process with ID was successfully suspended.`;
            console.log(message);

            return {
                success: true,
                message: message
            };
        });

        this.on('resume', async (request: any) => {
            // const { id } = request.data;

            // const destination = await getHybridDestination(processAutomationService, request);
            // const result = await wfiApi.updateInstance(id, {
            //     status: 'RUNNING'
            // }).setBasePath(BASE_PATH).execute(destination);

            const message = `Process with ID was successfully resumed.`;
            console.log(message);

            return {
                success: true,
                message: message
            };
        });

        return super.init();
}}

module.exports = { BTPProcessService };
