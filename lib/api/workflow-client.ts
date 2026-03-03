import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);
const BASE_PATH = '/public/workflow/rest';

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
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances`;
  LOG.debug('Invoking url: ' + url);

  try {
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
      LOG.error(`Failed to start workflow. Status: ${res.status}, Body: ${body}`);
      throw new Error(cds.i18n.messages.at('WORKFLOW_START_FAILED', [res.status]));
    }

    const workflowInstance = await res.json();
    LOG.debug(`Workflow instance started with ID: ${workflowInstance.id}`);
    return { id: workflowInstance.id, success: true };
  } catch (err) {
    LOG.error(`Failed to start workflow. Error: ${err}`);
    throw new Error(
      cds.i18n.messages.at('WORKFLOW_START_FAILED', [
        err instanceof Error ? err.message : String(err),
      ]),
    );
  }
}

export async function getWorkflowsByBusinessKey(
  serviceUrl: string,
  jwt: string,
  businessKey: string,
  status: WorkflowStatus | WorkflowStatus[],
): Promise<WorkflowInstance[]> {
  const encodedBusinessKey = encodeURIComponent(businessKey);
  let queryUrl = `${serviceUrl}${BASE_PATH}/v1/workflow-instances?businessKey=${encodedBusinessKey}`;

  const statuses = Array.isArray(status) ? status : [status];
  statuses.forEach((s) => {
    queryUrl += `&status=${s}`;
  });
  LOG.debug('Invoking url: ' + queryUrl);

  try {
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(cds.i18n.messages.at('WORKFLOW_RETRIEVE_FAILED', [res.status]));
    }
    return await res.json();
  } catch (err) {
    LOG.error(`Failed to retrieve workflow instances. Error: ${err}`);
    throw new Error(
      cds.i18n.messages.at('WORKFLOW_RETRIEVE_FAILED', [
        err instanceof Error ? err.message : String(err),
      ]),
    );
  }
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

  try {
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
      LOG.error(
        `Failed to update workflow instance ${instanceId}. Status: ${res.status}, Body: ${errorBody}`,
      );
      throw new Error(cds.i18n.messages.at('WORKFLOW_UPDATE_FAILED', [res.status]));
    }
    return { id: instanceId, success: true };
  } catch (err) {
    LOG.error(`Failed to update workflow instance ${instanceId}. Error: ${err}`);
    throw new Error(
      cds.i18n.messages.at('WORKFLOW_UPDATE_FAILED', [
        err instanceof Error ? err.message : String(err),
      ]),
    );
  }
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
      updateWorkflowStatus(serviceUrl, jwt, instance.id, status, cascade).catch((err) => {
        LOG.error(`Failed to update instance ${instance.id}: ${err.message}`);
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

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      LOG.error(
        `Failed to get attributes for workflow instance ${instanceId}. Status: ${res.status}, Body: ${errorBody}`,
      );
      throw new Error(cds.i18n.messages.at('WORKFLOW_ATTRIBUTES_FAILED', [res.status]));
    }

    const responseText = await res.text();
    if (!responseText || responseText.trim() === '') {
      LOG.debug(`No attributes available for workflow instance ${instanceId}`);
      return [];
    }
    return JSON.parse(responseText);
  } catch (err) {
    LOG.error(`Failed to get attributes for workflow instance ${instanceId}. Error: ${err}`);
    throw new Error(
      cds.i18n.messages.at('WORKFLOW_ATTRIBUTES_FAILED', [
        err instanceof Error ? err.message : String(err),
      ]),
    );
  }
}

export async function getOutputs(
  serviceUrl: string,
  jwt: string,
  instanceId: string,
): Promise<Record<string, unknown>> {
  const url = `${serviceUrl}${BASE_PATH}/v1/workflow-instances/${instanceId}/outputs`;
  LOG.debug('Invoking url: ' + url);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorBody = await res.text();
      LOG.error(
        `Failed to get outputs for workflow instance ${instanceId}. Status: ${res.status}, Body: ${errorBody}`,
      );
      throw new Error(cds.i18n.messages.at('WORKFLOW_OUTPUTS_FAILED', [res.status]));
    }

    const responseText = await res.text();
    if (!responseText || responseText.trim() === '') {
      LOG.debug(`No outputs available for workflow instance ${instanceId}`);
      return {};
    }

    return JSON.parse(responseText);
  } catch (err) {
    LOG.error(`Failed to get outputs for workflow instance ${instanceId}. Error: ${err}`);
    throw new Error(
      cds.i18n.messages.at('WORKFLOW_OUTPUTS_FAILED', [
        err instanceof Error ? err.message : String(err),
      ]),
    );
  }
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
