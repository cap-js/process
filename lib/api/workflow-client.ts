import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX, BASE_PATH_PUBLIC } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============ Types & Enums ============

export enum WorkflowStatus {
  RUNNING = 'RUNNING',
  SUSPENDED = 'SUSPENDED',
  CANCELED = 'CANCELED',
  ERRONEOUS = 'ERRONEOUS',
  COMPLETED = 'COMPLETED',
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
    status: WorkflowStatus | WorkflowStatus[],
  ): Promise<WorkflowInstance[]>;

  updateWorkflowStatus(
    instanceId: string,
    status: WorkflowStatus,
    cascade: boolean,
  ): Promise<UpdateStatusResult>;

  updateMultipleWorkflowStatus(
    instances: WorkflowInstance[],
    status: WorkflowStatus,
    cascade: boolean,
  ): Promise<UpdateStatusResult[]>;

  getAttributes(instanceId: string): Promise<Record<string, string>[]>;

  getOutputs(instanceId: string): Promise<Record<string, unknown>>;
}

// ============ Implementation Functions ============

export async function startWorkflow(
  serviceUrl: string,
  jwt: string,
  definitionId: string,
  context: unknown,
): Promise<StartWorkflowResult> {
  const url = `${serviceUrl}${BASE_PATH_PUBLIC}/v1/workflow-instances`;
  LOG.debug('Invoking url: ' + url);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ definitionId, context }),
  });

  if (!res.ok) {
    const body = await res.text();
    const errorMessage = `Failed to start workflow: ${body || res.statusText || 'Unknown error'}`;
    throw cds.error(res.status, errorMessage);
  }

  const workflowInstance = await res.json();
  LOG.debug(`Workflow instance started with ID: ${workflowInstance.id}`);
  return { id: workflowInstance.id, success: true };
}

export async function getWorkflowsByBusinessKey(
  serviceUrl: string,
  jwt: string,
  businessKey: string,
  status: WorkflowStatus | WorkflowStatus[],
): Promise<WorkflowInstance[]> {
  const encodedBusinessKey = encodeURIComponent(businessKey);
  let queryUrl = `${serviceUrl}${BASE_PATH_PUBLIC}/v1/workflow-instances?businessKey=${encodedBusinessKey}`;

  const statuses = Array.isArray(status) ? status : [status];
  statuses.forEach((s) => {
    queryUrl += `&status=${s}`;
  });
  LOG.debug('Invoking url: ' + queryUrl);

  const res = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    const errorMessage = `Failed to retrieve workflow instances: ${body || res.statusText || 'Unknown error'}`;
    throw cds.error(res.status, errorMessage);
  }

  return await res.json();
}

export async function updateWorkflowStatus(
  serviceUrl: string,
  jwt: string,
  instanceId: string,
  status: WorkflowStatus,
  cascade: boolean,
): Promise<UpdateStatusResult> {
  const url = `${serviceUrl}${BASE_PATH_PUBLIC}/v1/workflow-instances/${instanceId}`;
  LOG.debug('Invoking url: ' + url);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, cascade }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const errorMessage = `Failed to update workflow instance: ${errorBody || res.statusText || 'Unknown error'}`;
    throw cds.error(res.status, errorMessage);
  }

  return { id: instanceId, success: true };
}

export async function updateMultipleWorkflowStatus(
  serviceUrl: string,
  jwt: string,
  instances: WorkflowInstance[],
  status: WorkflowStatus,
  cascade: boolean,
): Promise<UpdateStatusResult[]> {
  const results = await Promise.all(
    instances.map((instance) =>
      updateWorkflowStatus(serviceUrl, jwt, instance.id, status, cascade).catch(() => {
        return { id: instance.id, success: false };
      }),
    ),
  );

  const successCount = results.filter((r) => r.success).length;
  const failedCount = instances.length - successCount;

  if (failedCount > 0) {
    LOG.warn(
      `Updated ${successCount}/${instances.length} workflow instances to status ${status}. ${failedCount} failed.`,
    );
  } else {
    LOG.debug(`Successfully updated all ${successCount} workflow instances to status ${status}`);
  }

  return results;
}

export async function getAttributes(
  serviceUrl: string,
  jwt: string,
  instanceId: string,
): Promise<Record<string, string>[]> {
  const url = `${serviceUrl}${BASE_PATH_PUBLIC}/v1/workflow-instances/${instanceId}/attributes`;
  LOG.debug('Invoking url: ' + url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const errorMessage = `Failed to get workflow instance attributes: ${errorBody || res.statusText || 'Unknown error'}`;
    throw cds.error(res.status, errorMessage);
  }

  const responseText = await res.text();
  if (!responseText || responseText.trim() === '') {
    LOG.debug(`No attributes available for workflow instance ${instanceId}`);
    return [];
  }

  return JSON.parse(responseText);
}

export async function getOutputs(
  serviceUrl: string,
  jwt: string,
  instanceId: string,
): Promise<Record<string, unknown>> {
  const url = `${serviceUrl}${BASE_PATH_PUBLIC}/v1/workflow-instances/${instanceId}/outputs`;
  LOG.debug('Invoking url: ' + url);

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    const errorMessage = `Failed to get workflow instance outputs: ${errorBody || res.statusText || 'Unknown error'}`;
    throw cds.error(res.status, errorMessage);
  }

  const responseText = await res.text();
  if (!responseText || responseText.trim() === '') {
    LOG.debug(`No outputs available for workflow instance ${instanceId}`);
    return {};
  }

  return JSON.parse(responseText);
}

// ============ Factory Function ============

export function createWorkflowInstanceClient(
  serviceUrl: string,
  getToken: () => Promise<string>,
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
    },

    getAttributes: async (instanceId) => {
      const jwt = await getToken();
      return getAttributes(serviceUrl, jwt, instanceId);
    },

    getOutputs: async (instanceId) => {
      const jwt = await getToken();
      return getOutputs(serviceUrl, jwt, instanceId);
    },
  };
}
