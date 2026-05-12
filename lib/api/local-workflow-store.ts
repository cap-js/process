import {
  WorkflowStatus,
  WorkflowInstance,
  GetInstancesParams,
  INSTANCES_PARAMS_SKIP_KEYS,
  StartWorkflowResult,
  UpdateStatusResult,
} from './workflow-client';
import cds from '@sap/cds';

export interface LocalWorkflowInstance extends WorkflowInstance {
  context: Record<string, unknown>;
  attributes: Record<string, string>[];
  outputs: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StartWorkflowParams {
  definitionId: string;
  businessKey?: string;
  context?: Record<string, unknown>;
}

export class LocalWorkflowStore {
  private instances: LocalWorkflowInstance[] = [];

  startWorkflow(params: StartWorkflowParams): StartWorkflowResult {
    const { definitionId, businessKey, context = {} } = params;

    const instance: LocalWorkflowInstance = {
      id: cds.utils.uuid(),
      definitionId,
      businessKey,
      status: WorkflowStatus.RUNNING,
      context,
      attributes: [
        {
          id: 'ExampleCustomAttribute',
          label: 'Example of custom attribute',
          value: 'PRO_247',
          type: 'string',
        },
        {
          id: 'Cur',
          label: 'Currency',
          value: 'EUR',
          type: 'string',
        },
      ],
      outputs: {
        processedBy: 'system-admin',
        completionStatus: 'success',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.instances.push(instance);

    return {
      id: instance.id,
      success: true,
    };
  }

  getInstancesByBusinessKey(
    businessKey: string,
    status?: WorkflowStatus[],
  ): LocalWorkflowInstance[] {
    let filtered = this.instances.filter((i) => i.businessKey === businessKey);

    if (status) {
      filtered = filtered.filter((i) => status.includes(i.status));
    }

    return filtered;
  }

  getInstances(params: GetInstancesParams): LocalWorkflowInstance[] {
    const specialKeys = new Set([
      ...INSTANCES_PARAMS_SKIP_KEYS,
      'startedFrom',
      'startedUpTo',
      'completedFrom',
      'completedUpTo',
      'containsText',
      'rootInstanceId',
      'parentInstanceId',
      'skip',
      'top',
      'orderBy',
      'inlinecount',
    ]);

    let filteredInstances = [...this.instances];

    for (const [key, value] of Object.entries(params)) {
      if (value == null || specialKeys.has(key)) continue;
      filteredInstances = filteredInstances.filter((i) => i[key as keyof LocalWorkflowInstance] === value);
    }

    if (params.status && params.status.length > 0) {
      filteredInstances = filteredInstances.filter((i) => params.status!.includes(i.status));
    }

    if (params.startedFrom != null) {
      const from = new Date(params.startedFrom);
      filteredInstances = filteredInstances.filter((i) => i.startedAt != null && new Date(i.startedAt) >= from);
    }
    if (params.startedUpTo != null) {
      const upTo = new Date(params.startedUpTo);
      filteredInstances = filteredInstances.filter((i) => i.startedAt != null && new Date(i.startedAt) <= upTo);
    }
    if (params.completedFrom != null) {
      const from = new Date(params.completedFrom);
      filteredInstances = filteredInstances.filter((i) => i.completedAt != null && new Date(i.completedAt) >= from);
    }
    if (params.completedUpTo != null) {
      const upTo = new Date(params.completedUpTo);
      filteredInstances = filteredInstances.filter((i) => i.completedAt != null && new Date(i.completedAt) <= upTo);
    }

    if (params.containsText != null) {
      const text = params.containsText.toLowerCase();
      filteredInstances = filteredInstances.filter(
        (i) =>
          i.id.toLowerCase().includes(text) ||
          i.subject?.toLowerCase().includes(text) ||
          i.businessKey?.toLowerCase().includes(text),
      );
    }

    if (params.rootInstanceId != null)
      filteredInstances = filteredInstances.filter((i) => i.id === params.rootInstanceId);
    if (params.parentInstanceId != null)
      filteredInstances = filteredInstances.filter((i) => i.id === params.parentInstanceId);

    const skip = params.skip ?? 0;
    const top = params.top ?? filteredInstances.length;
    filteredInstances = filteredInstances.slice(skip, skip + top);

    return filteredInstances;
  }

  getInstance(instanceId: string): LocalWorkflowInstance | undefined {
    return this.instances.find((i) => i.id === instanceId);
  }

  updateStatus(instanceId: string, status: WorkflowStatus): UpdateStatusResult {
    const instance = this.getInstance(instanceId);

    if (!instance) {
      return {
        id: instanceId,
        success: false,
      };
    }

    instance.status = status;
    instance.updatedAt = new Date();

    return {
      id: instanceId,
      success: true,
    };
  }

  updateMultipleStatus(instanceIds: string[], status: WorkflowStatus): UpdateStatusResult[] {
    return instanceIds.map((id) => this.updateStatus(id, status));
  }

  getAttributes(instanceId: string): Record<string, string>[] | undefined {
    const instance = this.getInstance(instanceId);
    return instance?.attributes;
  }

  getOutputs(instanceId: string): Record<string, unknown> | undefined {
    const instance = this.getInstance(instanceId);
    return instance?.outputs;
  }
}

export const localWorkflowStore = new LocalWorkflowStore();
