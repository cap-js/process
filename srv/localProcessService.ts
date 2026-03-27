import cds from '@sap/cds';
import { localWorkflowStore } from '../lib/api/local-workflow-store';
import { WorkflowStatus } from '../lib/api/workflow-client';
import { PROCESS_LOGGER_PREFIX } from '../lib';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

class ProcessService extends cds.ApplicationService {
  async init() {
    this.on('start', async (req: cds.Request) => {
      const { definitionId, context } = req.data;
      const businessKey = req.headers['businessKey'] as string | undefined;
      LOG.info('Starting process', definitionId);

      LOG.debug(
        `==============================================================\n` +
          `Process start for ${definitionId} initiated\n` +
          `Context: ${JSON.stringify(context, null, 2)}\n` +
          `==============================================================`,
      );

      localWorkflowStore.startWorkflow({
        definitionId,
        businessKey,
        context,
      });
      return;
    });

    this.on('cancel', async (req: cds.Request) => {
      const { businessKey } = req.data;
      LOG.info('Cancelling process(es)', businessKey);

      LOG.debug(
        `==============================================================\n` +
          `Process cancel for ${businessKey} initiated\n` +
          `Context: ${JSON.stringify(req.data, null, 2)}\n` +
          `==============================================================`,
      );

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
      LOG.info('Suspending process(es)', businessKey);

      LOG.debug(
        `==============================================================\n` +
          `Process suspend for ${businessKey} initiated\n` +
          `Context: ${JSON.stringify(req.data, null, 2)}\n` +
          `==============================================================`,
      );

      const instances = localWorkflowStore.getInstancesByBusinessKey(businessKey, [
        WorkflowStatus.RUNNING,
      ]);

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
      LOG.info('Resuming process(es)', businessKey);

      LOG.debug(
        `==============================================================\n` +
          `Process resume for ${businessKey} initiated\n` +
          `Context: ${JSON.stringify(req.data, null, 2)}\n` +
          `==============================================================`,
      );

      const instances = localWorkflowStore.getInstancesByBusinessKey(businessKey, [
        WorkflowStatus.SUSPENDED,
      ]);

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

    this.on('getInstancesByBusinessKey', async (req: cds.Request) => {
      const { businessKey } = req.data;
      let { status } = req.data;
      LOG.info('Getting instances for', businessKey);

      LOG.debug(
        `==============================================================\n` +
          `Get instances by businessKey: ${businessKey}\n` +
          `==============================================================`,
      );

      if (!businessKey) {
        return req.reject({ status: 400, message: 'Missing required parameter: businessKey' });
      }

      if (!status) {
        status = [
          WorkflowStatus.RUNNING,
          WorkflowStatus.SUSPENDED,
          WorkflowStatus.COMPLETED,
          WorkflowStatus.ERRONEOUS,
        ];
      }

      const instances = localWorkflowStore.getInstancesByBusinessKey(businessKey, status);

      LOG.debug(`Found ${instances.length} workflow instance(s) for businessKey: ${businessKey}`);
      return instances;
    });

    this.on('getAttributes', async (req: cds.Request) => {
      const { processInstanceId } = req.data;
      LOG.info('Getting attributes for', processInstanceId);

      LOG.debug(
        `==============================================================\n` +
          `Get attributes for instance: ${processInstanceId}\n` +
          `==============================================================`,
      );

      if (!processInstanceId) {
        return req.reject({
          status: 400,
          message: 'Missing required parameter: processInstanceId',
        });
      }

      const attributes = localWorkflowStore.getAttributes(processInstanceId);

      if (attributes === undefined) {
        LOG.warn(`Workflow instance not found: ${processInstanceId}`);
        return req.reject({ status: 404, message: 'Workflow instance not found' });
      }

      LOG.debug(`Retrieved attributes for instance: ${processInstanceId}`);
      return attributes;
    });

    this.on('getOutputs', async (req: cds.Request) => {
      const { processInstanceId } = req.data;
      LOG.info('Getting outputs for', processInstanceId);

      LOG.debug(
        `==============================================================\n` +
          `Get outputs for instance: ${processInstanceId}\n` +
          `==============================================================`,
      );

      if (!processInstanceId) {
        return req.reject({
          status: 400,
          message: 'Missing required parameter: processInstanceId',
        });
      }

      const outputs = localWorkflowStore.getOutputs(processInstanceId);

      if (outputs === undefined) {
        LOG.warn(`Workflow instance not found: ${processInstanceId}`);
        return req.reject({ status: 404, message: 'Workflow instance not found' });
      }

      LOG.debug(`Retrieved outputs for instance: ${processInstanceId}`);
      return outputs;
    });

    return super.init();
  }
}

module.exports = { ProcessService };
