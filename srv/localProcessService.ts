import cds from '@sap/cds';
import { localWorkflowStore } from '../lib/api/local-workflow-store';
import { WorkflowStatus } from '../lib/api/workflow-client';
import { PROCESS_LOGGER_PREFIX } from '../lib';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

class ProcessService extends cds.ApplicationService {
    async init() {
        this.on('start', async (req: cds.Request) => {
            const { definitionId, context } = req.data;
            const businessKey = context?.businesskey ?? context?.businessKey;

            LOG.debug("==============================================================");
            LOG.debug(`Process start for ${definitionId} initiated`);
            LOG.debug(`BusinessKey: ${businessKey}`);
            LOG.debug('Context: ', JSON.stringify(context, null, 2));
            LOG.debug("==============================================================");

            const result = localWorkflowStore.startWorkflow({
                definitionId,
                businessKey,
                context
            });

            return result;
        });

        this.on('cancel', async (req: cds.Request) => {
            const { businessKey, cascade } = req.data;

            LOG.debug("==============================================================");
            LOG.debug(`Process cancel for ${businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const instances = localWorkflowStore.getInstancesByBusinessKey(
                businessKey,
                [WorkflowStatus.RUNNING, WorkflowStatus.SUSPENDED]
            );

            if (instances.length === 0) {
                LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
                return { success: false, message: `No running instances found for businessKey: ${businessKey}` };
            }

            const results = localWorkflowStore.updateMultipleStatus(
                instances.map(i => i.id),
                WorkflowStatus.CANCELED
            );

            const successCount = results.filter(r => r.success).length;
            LOG.info(`Cancelled ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`);

            return {
                success: results.every(r => r.success),
                message: `Cancelled ${successCount} workflow instance(s).`,
                results
            };
        });

        this.on('suspend', async (req: cds.Request) => {
            const { businessKey, cascade } = req.data;

            LOG.debug("==============================================================");
            LOG.debug(`Process suspend for ${businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const instances = localWorkflowStore.getInstancesByBusinessKey(
                businessKey,
                WorkflowStatus.RUNNING
            );

            if (instances.length === 0) {
                LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
                return { success: false, message: `No running instances found for businessKey: ${businessKey}` };
            }

            const results = localWorkflowStore.updateMultipleStatus(
                instances.map(i => i.id),
                WorkflowStatus.SUSPENDED
            );

            const successCount = results.filter(r => r.success).length;
            LOG.info(`Suspended ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`);

            return {
                success: results.every(r => r.success),
                message: `Suspended ${successCount} workflow instance(s).`,
                results
            };
        });

        this.on('resume', async (req: cds.Request) => {
            const { businessKey, cascade } = req.data;

            LOG.debug("==============================================================");
            LOG.debug(`Process resume for ${businessKey} initiated`);
            LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
            LOG.debug("==============================================================");

            const instances = localWorkflowStore.getInstancesByBusinessKey(
                businessKey,
                WorkflowStatus.SUSPENDED
            );

            if (instances.length === 0) {
                LOG.warn(`No suspended workflow instances found with businessKey: ${businessKey}`);
                return { success: false, message: `No suspended instances found for businessKey: ${businessKey}` };
            }

            const results = localWorkflowStore.updateMultipleStatus(
                instances.map(i => i.id),
                WorkflowStatus.RUNNING
            );

            const successCount = results.filter(r => r.success).length;
            LOG.info(`Resumed ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`);

            return {
                success: results.every(r => r.success),
                message: `Resumed ${successCount} workflow instance(s).`,
                results
            };
        });

        return super.init();
    }
}

module.exports = { ProcessService };
