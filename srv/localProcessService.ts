import crypto from 'crypto';
import cds from '@sap/cds';

const LOG = cds.log("process");

class ProcessService extends cds.ApplicationService {
    async init() {
        this.on('start', async (req: any) => {

            LOG.debug("==============================================================");
            LOG.debug(`Process start for ${req.data.definitionId} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data.context, null, 2));
            LOG.debug("==============================================================");

            const workflowInstance = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${workflowInstance.id} was successfully started.`;

            return {
                id: workflowInstance.id,
                success: true,
                message: message
            };
        });

        this.on('cancel', async (req: any) => {
            LOG.debug("==============================================================");
            LOG.debug(`Process cancel for ${req.data.businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const businessKey = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${businessKey.id} was successfully cancelled.`;

            return {
                id: businessKey.id,
                success: true,
                message: message
            };
        });

        this.on('suspend', async (req: any) => {
            LOG.debug("==============================================================");
            LOG.debug(`Process suspend for ${req.data.businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const businessKey = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${businessKey.id} was successfully suspended.`;

            return {
                id: businessKey.id,
                success: true,
                message: message
            };
        });
        this.on('resume', async (req: any) => {
            LOG.debug("==============================================================");
            LOG.debug(`Process resume for ${req.data.businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const businessKey = { id: crypto.randomUUID() }; // Placeholder
            const message = `Process with ID ${businessKey.id} was successfully resumed.`;

            return {
                id: businessKey.id,
                success: true,
                message: message
            };
        });
        return super.init();
    }
}

module.exports = { ProcessService };
