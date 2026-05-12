import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);
const BASE_PATH = '/public/workflow/rest';

// Keys in GetInstancesParams that need special handling and are not direct API query params
export const INSTANCES_PARAMS_SKIP_KEYS = new Set<keyof GetInstancesParams>(['status']);

// Remap camelCase param keys to the API's expected query param names
export const INSTANCES_PARAM_KEY_MAP: Partial<Record<keyof GetInstancesParams, string>> = {
  orderBy: '$orderby',
  top: '$top',
  skip: '$skip',
  inlinecount: '$inlinecount',
};

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
  definitionVersion?: string;
  startedAt?: string;
  completedAt?: string;
  startedBy?: string;
  subject?: string;
}

export interface GetInstancesParams {
  id?: string | null;
  businessKey?: string | null;
  status?: WorkflowStatus[];
  definitionId?: string | null;
  definitionVersion?: string | null;
  startedAt?: string | null;
  startedFrom?: string | null;
  startedUpTo?: string | null;
  completedAt?: string | null;
  completedFrom?: string | null;
  completedUpTo?: string | null;
  startedBy?: string | null;
  subject?: string | null;
  containsText?: string | null;
  rootInstanceId?: string | null;
  parentInstanceId?: string | null;
  orderBy?: string | null;
  top?: number | null;
  skip?: number | null;
  inlinecount?: string | null;
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
    status: WorkflowStatus[],
  ): Promise<WorkflowInstance[]>;

  getInstances(params: GetInstancesParams): Promise<WorkflowInstance[]>;

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
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances`;
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
  status: WorkflowStatus[],
): Promise<WorkflowInstance[]> {
  const encodedBusinessKey = encodeURIComponent(businessKey);
  let queryUrl = `${serviceUrl}${BASE_PATH}/v1/workflow-instances?businessKey=${encodedBusinessKey}`;

  status.forEach((s) => {
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

export async function getInstances(
  serviceUrl: string,
  jwt: string,
  params: GetInstancesParams,
): Promise<WorkflowInstance[]> {
  const queryParts: string[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value == null || INSTANCES_PARAMS_SKIP_KEYS.has(key as keyof GetInstancesParams)) continue;
    const apiKey = INSTANCES_PARAM_KEY_MAP[key as keyof GetInstancesParams] ?? key;
    queryParts.push(`${apiKey}=${encodeURIComponent(String(value))}`);
  }

  for (const s of params.status ?? []) {
    queryParts.push(`status=${encodeURIComponent(s)}`);
  }

  const queryString = queryParts.join('&');
  const queryUrl = `${serviceUrl}${BASE_PATH}/v1/workflow-instances${queryString ? '?' + queryString : ''}`;
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
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances/${instanceId}`;
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
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances/${instanceId}/attributes`;
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
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances/${instanceId}/outputs`;
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

    getInstances: async (params) => {
      const jwt = await getToken();
      return getInstances(serviceUrl, jwt, params);
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
