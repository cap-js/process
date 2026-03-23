/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

const DEFINITION_ID = 'eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Lifecycle_Process';

describe('Generic ProcessService Integration Tests', () => {
  afterAll(async () => {
    await (cds as any).flush();
  });

  function generateID(): string {
    return cds.utils.uuid();
  }

  async function genericStart(businessKey: string, context?: Record<string, unknown>) {
    const startContext = context ?? { ID: businessKey };
    return POST('/odata/v4/programmatic/genericStart', {
      definitionId: DEFINITION_ID,
      businessKey,
      context: JSON.stringify(startContext),
    });
  }

  async function genericCancel(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericCancel', {
      businessKey,
      cascade,
    });
  }

  async function genericSuspend(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericSuspend', {
      businessKey,
      cascade,
    });
  }

  async function genericResume(businessKey: string, cascade = false) {
    return POST('/odata/v4/programmatic/genericResume', {
      businessKey,
      cascade,
    });
  }

  async function genericGetInstances(businessKey: string, status?: string[]): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/genericGetInstancesByBusinessKey', {
      businessKey,
      status,
    });
    return res.data?.value ?? res.data ?? [];
  }

  async function genericGetAttributes(processInstanceId: string): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/genericGetAttributes', {
      processInstanceId,
    });
    return res.data?.value ?? res.data ?? [];
  }

  async function genericGetOutputs(processInstanceId: string): Promise<any> {
    const res = await POST('/odata/v4/programmatic/genericGetOutputs', {
      processInstanceId,
    });
    return res.data;
  }

  describe('Process Start Event', () => {
    it('should start a process and verify it is RUNNING', async () => {
      const businessKey = generateID();
      const response = await genericStart(businessKey);

      expect(response.status).toBe(204);

      const instances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
      expect(instances[0]).toHaveProperty('id');
      expect(instances[0]).toHaveProperty('definitionId', DEFINITION_ID);
    });

    it('should include the businessKey in the started instance', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const instances = await genericGetInstances(businessKey);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('businessKey', businessKey);
    });

    it('should start multiple independent processes with different businessKeys', async () => {
      const keyA = generateID();
      const keyB = generateID();

      await genericStart(keyA);
      await genericStart(keyB);

      const instancesA = await genericGetInstances(keyA, ['RUNNING']);
      const instancesB = await genericGetInstances(keyB, ['RUNNING']);

      expect(instancesA.length).toBe(1);
      expect(instancesB.length).toBe(1);
      expect(instancesA[0].id).not.toEqual(instancesB[0].id);
    });
  });

  describe('Process Cancel Event', () => {
    it('should cancel a running process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const response = await genericCancel(businessKey);
      expect(response.status).toBe(204);

      const instances = await genericGetInstances(businessKey, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });

    it('should not fail when cancelling with no running processes', async () => {
      const businessKey = generateID();
      const response = await genericCancel(businessKey);
      expect(response.status).toBe(204);
    });
  });

  describe('Process Suspend Event', () => {
    it('should suspend a running process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const response = await genericSuspend(businessKey);
      expect(response.status).toBe(204);

      const instances = await genericGetInstances(businessKey, ['SUSPENDED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'SUSPENDED');
    });

    it('should not fail when suspending with no running processes', async () => {
      const businessKey = generateID();
      const response = await genericSuspend(businessKey);
      expect(response.status).toBe(204);
    });
  });

  describe('Process Resume Event', () => {
    it('should resume a suspended process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);
      await genericSuspend(businessKey);

      const response = await genericResume(businessKey);
      expect(response.status).toBe(204);

      const instances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('should not fail when resuming with no suspended processes', async () => {
      const businessKey = generateID();
      const response = await genericResume(businessKey);
      expect(response.status).toBe(204);
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should go through start -> suspend -> resume and end up RUNNING', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);

      let instances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);

      await genericSuspend(businessKey);

      instances = await genericGetInstances(businessKey, ['SUSPENDED']);
      expect(instances.length).toBe(1);

      await genericResume(businessKey);

      instances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('should go through start -> cancel and end up CANCELED', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);

      let instances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);

      await genericCancel(businessKey);

      instances = await genericGetInstances(businessKey, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });

    it('should go through start -> suspend -> resume -> cancel', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await genericSuspend(businessKey);
      await genericResume(businessKey);
      await genericCancel(businessKey);

      const instances = await genericGetInstances(businessKey, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });
  });

  describe('getInstancesByBusinessKey', () => {
    it('should return empty array for unknown businessKey', async () => {
      const businessKey = generateID();
      const instances = await genericGetInstances(businessKey);
      expect(instances).toEqual([]);
    });

    it('should filter instances by status', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const runningInstances = await genericGetInstances(businessKey, ['RUNNING']);
      expect(runningInstances.length).toBe(1);

      const canceledInstances = await genericGetInstances(businessKey, ['CANCELED']);
      expect(canceledInstances.length).toBe(0);
    });

    it('should return instances matching any of the provided statuses', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const instances = await genericGetInstances(businessKey, ['RUNNING', 'SUSPENDED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });
  });

  it('should return attributes for a running process instance', async () => {
    const businessKey = generateID();
    await genericStart(businessKey);

    const instances = await genericGetInstances(businessKey, ['RUNNING']);
    expect(instances.length).toBe(1);

    const attributes = await genericGetAttributes(instances[0].id);

    expect(Array.isArray(attributes)).toBe(true);
    expect(attributes.length).toBeGreaterThan(0);
    expect(attributes[0]).toHaveProperty('id');
    expect(attributes[0]).toHaveProperty('value');
  });

  it('should return outputs for a process instance', async () => {
    const businessKey = generateID();
    await genericStart(businessKey);

    const instances = await genericGetInstances(businessKey, ['RUNNING']);
    expect(instances.length).toBe(1);

    const outputs = await genericGetOutputs(instances[0].id);

    expect(outputs).toBeDefined();
    expect(outputs).toHaveProperty('processedBy');
    expect(outputs).toHaveProperty('completionStatus');
  });
});
