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

      LOG.debug('==============================================================');
      LOG.debug(`Process start for ${definitionId} initiated`);
      LOG.debug(`BusinessKey: ${businessKey}`);
      LOG.debug('Context: ', JSON.stringify(context, null, 2));
      LOG.debug('==============================================================');

      localWorkflowStore.startWorkflow({
        definitionId,
        businessKey,
        context,
      });
      return;
    });

    this.on('cancel', async (req: cds.Request) => {
      const { businessKey } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Process cancel for ${businessKey} initiated`);
      LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
      LOG.debug('==============================================================');

      const instances = localWorkflowStore.getInstancesByBusinessKey(businessKey, [
        WorkflowStatus.RUNNING,
        WorkflowStatus.SUSPENDED,
      ]);

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      const results = localWorkflowStore.updateMultipleStatus(
        instances.map((i) => i.id),
        WorkflowStatus.CANCELED,
      );

      const successCount = results.filter((r) => r.success).length;
      LOG.debug(
        `Cancelled ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    this.on('suspend', async (req: cds.Request) => {
      const { businessKey } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Process suspend for ${businessKey} initiated`);
      LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
      LOG.debug('==============================================================');

      const instances = localWorkflowStore.getInstancesByBusinessKey(
        businessKey,
        WorkflowStatus.RUNNING,
      );

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      const results = localWorkflowStore.updateMultipleStatus(
        instances.map((i) => i.id),
        WorkflowStatus.SUSPENDED,
      );

      const successCount = results.filter((r) => r.success).length;
      LOG.debug(
        `Suspended ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    this.on('resume', async (req: cds.Request) => {
      const { businessKey } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Process resume for ${businessKey} initiated`);
      LOG.debug('Context: ', JSON.stringify(req.data, null, 2));
      LOG.debug('==============================================================');

      const instances = localWorkflowStore.getInstancesByBusinessKey(
        businessKey,
        WorkflowStatus.SUSPENDED,
      );

      if (instances.length === 0) {
        LOG.warn(`No suspended workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      const results = localWorkflowStore.updateMultipleStatus(
        instances.map((i) => i.id),
        WorkflowStatus.RUNNING,
      );

      const successCount = results.filter((r) => r.success).length;
      LOG.debug(
        `Resumed ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    return super.init();
  }
}

module.exports = { ProcessService };
