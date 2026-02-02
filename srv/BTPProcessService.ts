import cds from "@sap/cds";
import { getServiceCredentials, getServiceToken } from "../lib/btp-utils";
import { TokenCache } from "../lib/token-cache";

const LOG = cds.log("process");

const BASE_PATH = '/public/workflow/rest'
const PROCESS_SERVICE = 'ProcessService';

enum WorkflowStatus {
    RUNNING = 'RUNNING',
    SUSPENDED = 'SUSPENDED',
    CANCELED = 'CANCELED',
    ERRONEOUS = 'ERRONEOUS',
    COMPLETED = 'COMPLETED'
}

class ProcessService extends cds.ApplicationService {

    tokenCache = new TokenCache();
    async init() {
        console.log('Initializing Process Service...');

        this.on('start', async (request: any) => {
            const credentials = await getServiceCredentials(PROCESS_SERVICE);
            const srvUrl = credentials?.endpoints.api;
            const jwt = await this.getToken(cds.context?.tenant, request);

            let { definitionId, context } = request.data;


            // context = {
            //     "businesskey": "test_business",
            //     "startingShipment": {
            //         "identifier": "shipment_12345",
            //         "items": [{
            //             "identifier": "item_1",
            //             "title": "Laptop",
            //             "quantity": 1,
            //             "price": 1200.00
            //         }]
            //     }
            // }

            const response = await fetch(`${srvUrl}${BASE_PATH}/v1/workflow-instances`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    definitionId: definitionId,
                    context: context
                })
            });

            if (!response.ok) {
                const body = await response.text();
                LOG.error(`Failed to start workflow. Status: ${response.status}, Body: ${body}`);
                throw new Error(`Unexpected error during starting a workflow. Status: ${response.status}`);
            }
            const workflowInstance = await response.json();
            LOG.info(`Workflow instance started with ID: ${workflowInstance.id}`);
            LOG.debug(`Workflow Instance Details: ${JSON.stringify(workflowInstance)}`);

            return {
                id: workflowInstance.id,
                success: true
            };
        });

        this.on('cancel', async (request: any) => {

            const credentials = await getServiceCredentials(PROCESS_SERVICE);
            const srvUrl = credentials?.endpoints.api;
            const jwt = await this.getToken(cds.context?.tenant, request);

            let { businessKey, cascade } = request.data;

            const workflowInstances = await this.getWorkflowDefinitionByKey(businessKey, jwt, srvUrl, [WorkflowStatus.RUNNING, WorkflowStatus.SUSPENDED]);
            LOG.debug('Query Response Status:', workflowInstances);

            if (workflowInstances.length === 0) {
                LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
                return;
            }

            await this.patchWorkflowInstanceStatus(workflowInstances, WorkflowStatus.CANCELED, jwt, srvUrl, cascade);
        });

        this.on('suspend', async (request: any) => {
            const credentials = await getServiceCredentials(PROCESS_SERVICE);
            const srvUrl = credentials?.endpoints.api;
            const jwt = await this.getToken(cds.context?.tenant, request);

            let { businessKey, cascade } = request.data;
            const workflowInstances = await this.getWorkflowDefinitionByKey(businessKey, jwt, srvUrl, WorkflowStatus.RUNNING);

            LOG.debug('Query Response Status:', workflowInstances);

            if (workflowInstances.length === 0) {
                LOG.warn(`No running workflow instances found with businessKey: ${businessKey}`);
                return;
            }

            await this.patchWorkflowInstanceStatus(workflowInstances, WorkflowStatus.SUSPENDED, jwt, srvUrl, cascade);
        });

        this.on('resume', async (request: any) => {
            const credentials = await getServiceCredentials(PROCESS_SERVICE);
            const srvUrl = credentials?.endpoints.api;
            const jwt = await this.getToken(cds.context?.tenant, request);

            let { businessKey, cascade } = request.data;

            const workflowInstances = await this.getWorkflowDefinitionByKey(businessKey, jwt, srvUrl, WorkflowStatus.SUSPENDED);
            LOG.debug('Query Response Status:', workflowInstances);

            if (workflowInstances.length === 0) {
                LOG.warn(`No suspended workflow instances found with businessKey: ${businessKey}`);
                return;
            }

            await this.patchWorkflowInstanceStatus(workflowInstances, WorkflowStatus.RUNNING, jwt, srvUrl, cascade);

            return;
        });

        return super.init();
    }

    async patchWorkflowInstanceStatus(workflowInstances: any[], status: string, jwt: string, srvUrl: string, cascade: boolean) {
        const resumeResults = [];
        for (const instance of workflowInstances) {
            const resumeResponse = await fetch(`${srvUrl}${BASE_PATH}/v1/workflow-instances/${instance.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${jwt}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: status, cascade: cascade })
            });
            if (resumeResponse.ok) {
                LOG.debug(`Successfully updated workflow instance ${instance.id} to status ${status}`);
                resumeResults.push({ id: instance.id, success: true });
            } else {
                const errorBody = await resumeResponse.text();
                LOG.error(`Failed to update workflow instance ${instance.id} to status ${status}. Status: ${resumeResponse.status}, Body: ${errorBody}`);
                resumeResults.push({ id: instance.id, success: false, error: errorBody });
            }
        }
        LOG.info(`Updated ${resumeResults.filter(r => r.success).length} out of ${workflowInstances.length} workflow instances to status ${status}`);
    }

    async getWorkflowDefinitionByKey(businessKey: string, jwt: string, srvUrl: string, status: string | string[]) {

        let queryUrl = `${srvUrl}${BASE_PATH}/v1/workflow-instances?businessKey=${businessKey}`;

        if (Array.isArray(status)) {
            status.forEach(s => {
                queryUrl += `&status=${s}`;
            });
        } else {
            queryUrl += `&status=${status}`;
        }

        const queryResponse = await fetch(queryUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            }
        });

        if (!queryResponse.ok) {
            const body = await queryResponse.text();
            LOG.error(`Failed to retrieve workflow instances. Status: ${queryResponse.status}, Body: ${body}`);
            throw new Error(`Unexpected error during retrieving workflow instances with businessKey: ${businessKey} Status: ${queryResponse.status}`);
        }

        return await queryResponse.json();

    }

    async getToken(tenant: string | undefined, request: cds.Request): Promise<string> {
        const tenantId = tenant ?? 'single-tenant';
        const cachedToken = this.tokenCache.get(tenantId);

        if (cachedToken) {
            LOG.trace(`Using cached token for tenant: ${tenantId}`);
            return cachedToken;
        }

        try {
            const { jwt, expires_in } = await getServiceToken(
                PROCESS_SERVICE
            );
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
