import crypto = require("crypto");

const cds = require('@sap/cds');
const LOG = cds.log("process");

class ProcessService extends cds.ApplicationService { async init() {
        console.log('Initializing Local Process Service...')

        this.on('start', async (req: any) => {
            
            LOG.info("==============================================================");
            LOG.info(`Process start for ${req.data.definitionId} initiated`);
            LOG.info('Context: ', JSON.stringify(req.data.context, null, 2));
            LOG.info("==============================================================");

            const workflowInstance = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${workflowInstance.id} was successfully started.`;
            
            return {
                id: workflowInstance.id,
                success: true,
                message: message
            }; 
        });

        this.on('cancel', async (req: any) => {
            LOG.info("==============================================================");
            LOG.info(`Process cancel for ${req.data.businessKey} initiated`);
            LOG.info('Context: ', JSON.stringify(req.data, null, 2));
            LOG.info("==============================================================");

            const businessKey = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${businessKey.id} was successfully cancelled.`;
            
            return {
                id: businessKey.id,
                success: true,
                message: message
            }; 
        }); 

        return super.init();
}}

module.exports = { ProcessService };
