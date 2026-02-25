import crypto from 'crypto';
import {
  WorkflowStatus,
  WorkflowInstance,
  StartWorkflowResult,
  UpdateStatusResult,
} from './workflow-client';

export interface LocalWorkflowInstance extends WorkflowInstance {
  context: Record<string, unknown>;
  attributes: Record<string, unknown>;
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
      id: crypto.randomUUID(),
      definitionId,
      businessKey,
      status: WorkflowStatus.RUNNING,
      context,
      attributes: {
        priority: 'high',
        department: 'logistics',
        totalAmmount: 123.45,
      },
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
    status?: WorkflowStatus | WorkflowStatus[],
  ): LocalWorkflowInstance[] {
    let filtered = this.instances.filter((i) => i.businessKey === businessKey);

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      filtered = filtered.filter((i) => statuses.includes(i.status));
    }

    return filtered;
  }

  getInstance(instanceId: string): LocalWorkflowInstance | undefined {
    return this.instances.find((i) => i.id === instanceId);
  }

  updateStatus(instanceId: string, status: WorkflowStatus): UpdateStatusResult {
    const instance = this.instances.find((i) => i.id === instanceId);

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

  getAttributes(instanceId: string): Record<string, unknown> | undefined {
    const instance = this.instances.find((i) => i.id === instanceId);
    return instance?.attributes;
  }

  getOutputs(instanceId: string): Record<string, unknown> | undefined {
    const instance = this.instances.find((i) => i.id === instanceId);
    return instance?.outputs;
  }

  clear(): void {
    this.instances = [];
  }
}

export const localWorkflowStore = new LocalWorkflowStore();
