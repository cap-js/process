/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-await-in-loop */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

const DEFINITION_ID = 'eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Lifecycle_Process';

describe('Generic ProcessService Hybrid Tests', () => {
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

  async function waitForInstances(
    businessKey: string,
    status: string[],
    expectedCount = 1,
    maxRetries = 6,
  ): Promise<any[]> {
    for (let i = 0; i < maxRetries; i++) {
      const instances = await genericGetInstances(businessKey, status);
      if (instances.length >= expectedCount) return instances;
      await new Promise((r) => setTimeout(r, 10000));
    }
    throw new Error(
      `Timed out waiting for ${expectedCount} instance(s) with status [${status}] for businessKey ${businessKey}`,
    );
  }

  describe('Process Start', () => {
    it('should start a process and verify it is RUNNING on SBPA', async () => {
      const businessKey = generateID();
      const response = await genericStart(businessKey);

      expect(response.status).toBe(204);

      const instances = await waitForInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('id');
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
      expect(instances[0]).toHaveProperty('definitionId');
    });

    it('should start multiple independent processes', async () => {
      const keyA = generateID();
      const keyB = generateID();

      await genericStart(keyA);
      await genericStart(keyB);

      const instancesA = await waitForInstances(keyA, ['RUNNING']);
      const instancesB = await waitForInstances(keyB, ['RUNNING']);

      expect(instancesA.length).toBe(1);
      expect(instancesB.length).toBe(1);
      expect(instancesA[0].id).not.toEqual(instancesB[0].id);
    });
  });

  describe('Process Suspend', () => {
    it('should suspend a running process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);
      await waitForInstances(businessKey, ['RUNNING']);

      const response = await genericSuspend(businessKey);
      expect(response.status).toBe(204);

      const instances = await waitForInstances(businessKey, ['SUSPENDED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'SUSPENDED');
    });
  });

  describe('Process Resume', () => {
    it('should resume a suspended process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);
      await waitForInstances(businessKey, ['RUNNING']);

      await genericSuspend(businessKey);
      await waitForInstances(businessKey, ['SUSPENDED']);

      const response = await genericResume(businessKey);
      expect(response.status).toBe(204);

      const instances = await waitForInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });
  });

  describe('Process Cancel', () => {
    it('should cancel a running process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);
      await waitForInstances(businessKey, ['RUNNING']);

      const response = await genericCancel(businessKey);
      expect(response.status).toBe(204);

      const instances = await waitForInstances(businessKey, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should go through start -> suspend -> resume and end up RUNNING', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await waitForInstances(businessKey, ['RUNNING']);

      await genericSuspend(businessKey);
      await waitForInstances(businessKey, ['SUSPENDED']);

      await genericResume(businessKey);

      const instances = await waitForInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('should go through start -> cancel and end up CANCELED', async () => {
      const businessKey = generateID();

      await genericStart(businessKey);
      await waitForInstances(businessKey, ['RUNNING']);

      await genericCancel(businessKey);

      const instances = await waitForInstances(businessKey, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });
  });

  describe('Get Attributes', () => {
    it('should return attributes for a running process', async () => {
      const businessKey = generateID();
      await genericStart(businessKey);

      const instances = await waitForInstances(businessKey, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('id');

      const attributes = await genericGetAttributes(instances[0].id);

      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBeGreaterThan(0);
    });
  });
});
