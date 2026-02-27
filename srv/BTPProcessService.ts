import cds from '@sap/cds';
import {
  getServiceCredentials,
  TokenCache,
  ITokenProvider,
  createXsuaaTokenProvider,
} from '../lib/auth';
import { IWorkflowInstanceClient, createWorkflowInstanceClient, WorkflowStatus } from '../lib/api';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from '../lib';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

class ProcessService extends cds.ApplicationService {
  private workflowInstanceClient!: IWorkflowInstanceClient;
  private tokenProvider!: ITokenProvider;
  private tokenCache = new TokenCache();

  async init() {
    LOG.debug('Initializing Process Service...');

    const credentials = getServiceCredentials(PROCESS_SERVICE);

    this.tokenProvider = createXsuaaTokenProvider(credentials);

    this.workflowInstanceClient = createWorkflowInstanceClient(credentials?.endpoints.api, () =>
      this.getToken(cds.context?.tenant),
    );

    this.on('start', async (request: cds.Request) => {
      const { definitionId, context } = request.data;
      await this.workflowInstanceClient.startWorkflow(definitionId, context);
    });

    this.on('cancel', async (request: cds.Request) => {
      const { businessKey, cascade } = request.data;

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

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        WorkflowStatus.RUNNING,
      );

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

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        WorkflowStatus.SUSPENDED,
      );

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

      if (!businessKey) {
        return request.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
      }

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(businessKey, [
        WorkflowStatus.RUNNING,
        WorkflowStatus.SUSPENDED,
        WorkflowStatus.COMPLETED,
        WorkflowStatus.ERRONEOUS,
      ]);

      return instances;
    });

    this.on('getAttributes', async (request: cds.Request) => {
      const { processInstanceId } = request.data;

      if (!processInstanceId) {
        return request.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
      }

      const attributes = await this.workflowInstanceClient.getAttributes(processInstanceId);
      return attributes;
    });

    this.on('getOutputs', async (request: cds.Request) => {
      const { processInstanceId } = request.data;

      if (!processInstanceId) {
        return request.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
      }

      const outputs = await this.workflowInstanceClient.getOutputs(processInstanceId);
      return outputs;
    });

    return super.init();
  }

  private async getToken(tenant: string | undefined): Promise<string> {
    const tenantId = tenant ?? 'single-tenant';
    const cachedToken = this.tokenCache.get(tenantId);

    if (cachedToken) {
      LOG.trace(`Using cached token for tenant: ${tenantId}`);
      return cachedToken;
    }

    try {
      const { jwt, expires_in } = await this.tokenProvider.fetchToken(tenant);
      this.tokenCache.set?.(tenantId, jwt, expires_in);
      LOG.debug(`Token fetched and cached for tenant: ${tenantId}`);
      return jwt;
    } catch (error) {
      LOG.error('Error fetching token for Process Service:', error);
      throw new Error(cds.i18n.messages.at('AUTH_TOKEN_FETCH_FAILED'));
    }
  }
}

module.exports = { ProcessService };
