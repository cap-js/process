import crypto = require("crypto");

const cds = require('@sap/cds');
const LOG = cds.log("process");

class ProcessService extends cds.ApplicationService { async init() {
        console.log('Initializing Local Process Service...')

        this.on('start', async (req: any) => {
            
            LOG.info("===============================");
            LOG.info(`Process start for ${req.data.definitionId} initiated`);
            LOG.info("===============================");

            const workflowInstance = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${workflowInstance.id} was successfully started.`;
            
            return {
                id: workflowInstance.id,
                success: true,
                message: message
            }; 
        });

        return super.init();
}}

module.exports = { ProcessService };
