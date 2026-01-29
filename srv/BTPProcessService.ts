const cds = require('@sap/cds');
const { getAuth } = require('../utils/cdk-utils');
const LOG = cds.log("process");

const BASE_PATH = '/public/workflow/rest'

class ProcessService extends cds.ApplicationService { async init() {
        console.log('Initializing Process Service...');

        this.on('start', async (request: any) => {
            const { definitionId, context } = request.data;
            
            const workflowService = await cds.connect.to('Workflow');
            const processAutomationService = await cds.connect.to('process-automation-service');
            const authToken = await getAuth(processAutomationService);
            
            const workflowInstance = await workflowService.send({
                method: 'POST',
                path: '/v1/workflow-instances',
                headers: {
                    'Authorization': authToken
                },
                data: {
                    definitionId: definitionId,
                    context: context
                }
            });

            const message = `Process with ID ${workflowInstance.id} was successfully started.`;
            

            LOG.debug(message);
            /*
            Just to test
                context =  {
                    "startingShipment": {
                        "identifier": "shipment_12345",
                        "items": [ {
                        "identifier": "item_1",
                        "title": "Laptop",
                        "quantity": 1,
                        "price": 1200.00
                        }]
                    }
                }
            */


            return {
                id: workflowInstance.id,
                success: true,
                message: message
            }; 
        });

        this.on('cancel', async (request: any) => {
            return {
            id: "1234",
            success: false,
            message: "Not implemented yet"
        }; 
          
        });

        return super.init();
}}

module.exports = { ProcessService };
