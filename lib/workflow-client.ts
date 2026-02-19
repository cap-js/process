import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from './constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);
const BASE_PATH = '/public/workflow/rest';

// ============ Types & Enums ============

export enum WorkflowStatus {
  RUNNING = 'RUNNING',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
  ERRONEOUS = 'ERRONEOUS',
  COMPLETED = 'COMPLETED'
}

export interface WorkflowInstance {
  id: string;
  businessKey?: string;
  status: WorkflowStatus;
  definitionId?: string;
}

export interface StartWorkflowResult {
  id: string;
  success: boolean;
}

export interface UpdateStatusResult {
  id: string;
  success: boolean;
}

// ============ Interface ============

export interface IWorkflowInstanceClient {
  startWorkflow(definitionId: string, context: unknown): Promise<StartWorkflowResult>;

  getWorkflowsByBusinessKey(
    businessKey: string,
    status: WorkflowStatus | WorkflowStatus[]
  ): Promise<WorkflowInstance[]>;

  updateWorkflowStatus(
    instanceId: string,
    status: WorkflowStatus,
    cascade: boolean
  ): Promise<UpdateStatusResult>;

  updateMultipleWorkflowStatus(
    instances: WorkflowInstance[],
    status: WorkflowStatus,
    cascade: boolean
  ): Promise<UpdateStatusResult[]>;
}

// ============ Implementation Functions ============

export async function startWorkflow(
  serviceUrl: string,
  jwt: string,
  definitionId: string,
  context: unknown
): Promise<StartWorkflowResult> {
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances`;
  LOG.debug('Invoking url: ' + url);

  return await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ definitionId, context })
  }).then(async res => {
    if (!res.ok) {
      const body = await res.text();
      LOG.error(`Failed to start workflow. Status: ${res.status}, Body: ${body}`);
      throw new Error(`Failed to start workflow: ${res.status}`);
    }
    return res.json();
  }).then(workflowInstance => {
    LOG.debug(`Workflow instance started with ID: ${workflowInstance.id}`);
    return { id: workflowInstance.id, success: true };
  }).catch(err => {
    LOG.error(`Failed to start workflow. Error: ${err}`);
    throw new Error(`Failed to start workflow: ${err.message}`);
  });
}

export async function getWorkflowsByBusinessKey(
  serviceUrl: string,
  jwt: string,
  businessKey: string,
  status: WorkflowStatus | WorkflowStatus[]
): Promise<WorkflowInstance[]> {
  let queryUrl = `${serviceUrl}${BASE_PATH}/v1/workflow-instances?businessKey=${businessKey}`;

  const statuses = Array.isArray(status) ? status : [status];
  statuses.forEach(s => {
    queryUrl += `&status=${s}`;
  });
  LOG.debug('Invoking url: ' + queryUrl);

  return await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }).catch(err => {
    LOG.error(`Failed to retrieve workflow instances. Error: ${err}`);
    throw new Error(`Failed to retrieve workflow instances: ${err.message}`);
  });
}

export async function updateWorkflowStatus(
  serviceUrl: string,
  jwt: string,
  instanceId: string,
  status: WorkflowStatus,
  cascade: boolean
): Promise<UpdateStatusResult> {
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances/${instanceId}`;
  LOG.debug('Invoking url: ' + url);

  return await fetch(
    url,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, cascade })
    }
  ).then(async res => {
    if (!res.ok) {
      const errorBody = await res.text();
      LOG.error(`Failed to update workflow instance ${instanceId}. Status: ${res.status}, Body: ${errorBody}`);
      throw new Error(`Failed to update workflow instance: ${res.status}`);
    }
    LOG.debug(`Successfully updated workflow instance ${instanceId} to status ${status}`);
    return { id: instanceId, success: true };
  }).catch(err => {
    LOG.error(`Failed to update workflow instance ${instanceId}. Error: ${err}`);
    throw new Error(`Failed to update workflow instance: ${err.message}`);
  });
}

export async function updateMultipleWorkflowStatus(
  serviceUrl: string,
  jwt: string,
  instances: WorkflowInstance[],
  status: WorkflowStatus,
  cascade: boolean
): Promise<UpdateStatusResult[]> {
  const results = await Promise.all(
    instances.map(instance =>
      updateWorkflowStatus(serviceUrl, jwt, instance.id, status, cascade)
        .catch(err => {
          LOG.error(`Failed to update instance ${instance.id}: ${err.message}`);
          return { id: instance.id, success: false };
        })
    )
  );

  const successCount = results.filter(r => r.success).length;
  const failedCount = instances.length - successCount;

  if (failedCount > 0) {
    LOG.warn(`Updated ${successCount}/${instances.length} workflow instances to status ${status}. ${failedCount} failed.`);
  } else {
    LOG.info(`Successfully updated all ${successCount} workflow instances to status ${status}`);
  }

  return results;
}

// ============ Factory Function ============

export function createWorkflowInstanceClient(
  serviceUrl: string,
  getToken: () => Promise<string>
): IWorkflowInstanceClient {
  return {
    startWorkflow: async (definitionId, context) => {
      const jwt = await getToken();
      return startWorkflow(serviceUrl, jwt, definitionId, context);
    },

    getWorkflowsByBusinessKey: async (businessKey, status) => {
      const jwt = await getToken();
      return getWorkflowsByBusinessKey(serviceUrl, jwt, businessKey, status);
    },

    updateWorkflowStatus: async (instanceId, status, cascade) => {
      const jwt = await getToken();
      return updateWorkflowStatus(serviceUrl, jwt, instanceId, status, cascade);
    },

    updateMultipleWorkflowStatus: async (instances, status, cascade) => {
      const jwt = await getToken();
      return updateMultipleWorkflowStatus(serviceUrl, jwt, instances, status, cascade);
    }
  };
}
