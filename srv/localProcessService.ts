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

      const result = localWorkflowStore.startWorkflow({
        definitionId,
        businessKey,
        context,
      });

      return;
    });

    this.on('cancel', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;

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
      LOG.info(
        `Cancelled ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    this.on('suspend', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;

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
      LOG.info(
        `Suspended ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    this.on('resume', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;

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
      LOG.info(
        `Resumed ${successCount}/${instances.length} workflow instance(s) for businessKey: ${businessKey}`,
      );

      return;
    });

    this.on('getInstancesByBusinessKey', async (req: cds.Request) => {
      const { businessKey } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Get instances by businessKey: ${businessKey}`);
      LOG.debug('==============================================================');

      if (!businessKey) {
        return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
      }

      const instances = localWorkflowStore.getInstancesByBusinessKey(businessKey);

      LOG.info(`Found ${instances.length} workflow instance(s) for businessKey: ${businessKey}`);
      return instances;
    });

    this.on('getAttributes', async (req: cds.Request) => {
      const { processInstanceId } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Get attributes for instance: ${processInstanceId}`);
      LOG.debug('==============================================================');

      if (!processInstanceId) {
        return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
      }

      const attributes = localWorkflowStore.getAttributes(processInstanceId);

      if (attributes === undefined) {
        LOG.warn(`Workflow instance not found: ${processInstanceId}`);
        return req.reject({ status: 404, message: 'WORKFLOW_INSTANCE_NOT_FOUND' });
      }

      LOG.info(`Retrieved attributes for instance: ${processInstanceId}`);
      return attributes;
    });

    this.on('getOutputs', async (req: cds.Request) => {
      const { processInstanceId } = req.data;

      LOG.debug('==============================================================');
      LOG.debug(`Get outputs for instance: ${processInstanceId}`);
      LOG.debug('==============================================================');

      if (!processInstanceId) {
        return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
      }

      const outputs = localWorkflowStore.getOutputs(processInstanceId);

      if (outputs === undefined) {
        LOG.warn(`Workflow instance not found: ${processInstanceId}`);
        return req.reject({ status: 404, message: 'WORKFLOW_INSTANCE_NOT_FOUND' });
      }

      LOG.info(`Retrieved outputs for instance: ${processInstanceId}`);
      return outputs;
    });

    return super.init();
  }
}

module.exports = { ProcessService };
