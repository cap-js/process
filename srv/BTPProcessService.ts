import cds from '@sap/cds';
import { getServiceCredentials, CachingTokenProvider, createXsuaaTokenProvider } from '../lib/auth';
import { IWorkflowInstanceClient, createWorkflowInstanceClient, WorkflowStatus } from '../lib/api';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from '../lib';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

class ProcessService extends cds.ApplicationService {
  private workflowInstanceClient!: IWorkflowInstanceClient;
  private cachingTokenProvider!: CachingTokenProvider;

  async init() {
    LOG.debug('Initializing Process Service...');

    const credentials = getServiceCredentials(PROCESS_SERVICE);
    const tokenProvider = createXsuaaTokenProvider(credentials);
    this.cachingTokenProvider = new CachingTokenProvider(tokenProvider);

    this.workflowInstanceClient = createWorkflowInstanceClient(credentials?.endpoints.api, () =>
      this.getToken(cds.context?.tenant),
    );

    this.on('start', async (request: cds.Request) => {
      const { definitionId, context } = request.data;
      LOG.info('Starting process', definitionId);
      await this.workflowInstanceClient.startWorkflow(definitionId, context);
    });

    this.on('cancel', async (request: cds.Request) => {
      const { businessKey, cascade } = request.data;
      LOG.info('Cancelling process', businessKey);

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(businessKey, [
        WorkflowStatus.RUNNING,
        WorkflowStatus.SUSPENDED,
      ]);

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.CANCELED,
        cascade,
      );
    });

    this.on('suspend', async (request: cds.Request) => {
      const { businessKey, cascade } = request.data;
      LOG.info('Suspending process', businessKey);

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(businessKey, [
        WorkflowStatus.RUNNING,
      ]);

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.SUSPENDED,
        cascade,
      );
    });

    this.on('resume', async (request: cds.Request) => {
      const { businessKey, cascade } = request.data;
      LOG.info('Resuming process', businessKey);

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(businessKey, [
        WorkflowStatus.SUSPENDED,
      ]);

      if (instances.length === 0) {
        LOG.warn(`No suspended workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.RUNNING,
        cascade,
      );
    });

    this.on('getInstancesByBusinessKey', async (request: cds.Request) => {
      const { businessKey } = request.data;
      let { status } = request.data;
      LOG.info('Getting instances for', businessKey);

      if (!businessKey) {
        return request.reject({ status: 400, message: 'Missing required parameter: businessKey' });
      }

      if (!status) {
        status = [
          WorkflowStatus.RUNNING,
          WorkflowStatus.SUSPENDED,
          WorkflowStatus.COMPLETED,
          WorkflowStatus.ERRONEOUS,
        ];
      }

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        status,
      );
      return instances;
    });

    this.on('getAttributes', async (request: cds.Request) => {
      const { processInstanceId } = request.data;
      LOG.info('Getting attributes for', processInstanceId);

      if (!processInstanceId) {
        return request.reject({
          status: 400,
          message: 'Missing required parameter: processInstanceId',
        });
      }

      const attributes = await this.workflowInstanceClient.getAttributes(processInstanceId);
      return attributes;
    });

    this.on('getOutputs', async (request: cds.Request) => {
      const { processInstanceId } = request.data;
      LOG.info('Getting outputs for', processInstanceId);

      if (!processInstanceId) {
        return request.reject({
          status: 400,
          message: 'Missing required parameter: processInstanceId',
        });
      }

      const outputs = await this.workflowInstanceClient.getOutputs(processInstanceId);
      return outputs;
    });

    return super.init();
  }

  private async getToken(tenant: string | undefined): Promise<string> {
    try {
      return await this.cachingTokenProvider.getToken(tenant);
    } catch (error) {
      LOG.error('Error fetching token for Process Service:', error);
      throw new Error('Error during token fetching.', { cause: error });
    }
  }
}

module.exports = { ProcessService };
