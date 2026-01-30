import cds from "@sap/cds";
import { getServiceCredentials, getServiceToken } from "../lib/btp-utils";
import { TokenCache } from "../lib/token-cache";

const LOG = cds.log("process");

const BASE_PATH = '/public/workflow/rest'
const PROCESS_SERVICE = 'ProcessService';

class ProcessService extends cds.ApplicationService {

    tokenCache = new TokenCache();
    async init() {
        console.log('Initializing Process Service...');

        this.on('start', async (request: any) => {
            // TODO : cache Implementierung
            const credentials = await getServiceCredentials(PROCESS_SERVICE);
            const srvUrl = credentials?.endpoints.api;
            const jwt = await this.getToken(cds.context?.tenant, request);

            const { definitionId, context } = request.data;

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
                request.reject(500, `Unexpected error during starting a workflow. Status: ${response.status}`);

            }
            const workflowInstance = await response.json();
            LOG.debug(`Workflow started successfully with definitionId: ${definitionId}`);
            LOG.trace(`Workflow Instance Details: ${JSON.stringify(workflowInstance)}`);


            /*
            Just to test
                context =  {
                    "startingShipment": {
                        "identifier": "shipment_12345",
                        "items": [ {
                        "identifier": "item_1",
                        "title": "Laptop",
                        "quantity": 1,
                        "price": 1200.00
                        }]
                    }
                }
            */


            return {
                id: workflowInstance.id,
                success: true
            };
        });

        this.on('cancel', async (request: any) => {
            return {
                id: "1234",
                success: false,
                message: "Not implemented yet"
            };

        });
        this.on('suspend', async (request: any) => {
            return {
            id: "1234",
            success: false,
            message: "Not implemented yet"
        
            };
        }); 
          

        return super.init();
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
            request.reject(500, "Error during token fetching");
        }
    }
}

module.exports = { ProcessService };
