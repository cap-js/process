import cds from "@sap/cds";
import {
  getServiceCredentials,
  TokenCache,
  ITokenProvider,
  createXsuaaTokenProvider
} from "../lib/auth";
import { handleProcessRoutingForEvent } from "../lib/processEventRouter";
import {
  IWorkflowInstanceClient,
  createWorkflowInstanceClient,
  WorkflowStatus
} from "../lib/workflow-client";

const LOG = cds.log("process");
const PROCESS_SERVICE = 'ProcessService';

class ProcessService extends cds.ApplicationService {
  private workflowInstanceClient!: IWorkflowInstanceClient;
  private tokenProvider!: ITokenProvider;
  private tokenCache = new TokenCache();

  async init() {
    LOG.debug('Initializing Process Service...');

    const credentials = getServiceCredentials(PROCESS_SERVICE);

    this.tokenProvider = createXsuaaTokenProvider(credentials);

    this.workflowInstanceClient = createWorkflowInstanceClient(
      credentials?.endpoints.api,
      () => this.getToken(cds.context?.tenant)
    );

    this.on('start', async (request: any) => {
      const { definitionId, context } = request.data;
      return await this.workflowInstanceClient.startWorkflow(definitionId, context);
    });

    this.on('cancel', async (request: any) => {
      const { businessKey, cascade } = request.data;

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        [WorkflowStatus.RUNNING, WorkflowStatus.SUSPENDED]
      );

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.CANCELED,
        cascade
      );
    });

    this.on('suspend', async (request: any) => {
      const { businessKey, cascade } = request.data;

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        WorkflowStatus.RUNNING
      );

      if (instances.length === 0) {
        LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.SUSPENDED,
        cascade
      );
    });

    this.on('resume', async (request: any) => {
      const { businessKey, cascade } = request.data;

      const instances = await this.workflowInstanceClient.getWorkflowsByBusinessKey(
        businessKey,
        WorkflowStatus.SUSPENDED
      );

      if (instances.length === 0) {
        LOG.warn(`No suspended workflow instances found with businessKey: ${businessKey}`);
        return;
      }

      await this.workflowInstanceClient.updateMultipleWorkflowStatus(
        instances,
        WorkflowStatus.RUNNING,
        cascade
      );
    });

    this.on('*', async (req: any) => {
      await handleProcessRoutingForEvent(this, req);
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
      LOG.error("Error fetching token for Process Service:", error);
      throw new Error("Error during token fetching");
    }
  }
}

module.exports = { ProcessService };
