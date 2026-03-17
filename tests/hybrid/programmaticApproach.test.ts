/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-await-in-loop */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

describe('Programatic Approach Hybrid Tests', () => {
  // beforeEach(async () => {
  //   await test.data.reset();
  // });

  function generateID(): string {
    return cds.utils.uuid();
  }

  async function startProcess(ID: string) {
    return POST('/odata/v4/programatical/startLifeCycleProcess', { ID });
  }

  async function getInstances(ID: string, status?: string[]): Promise<any[]> {
    const res = await POST('/odata/v4/programatical/getInstancesByBusinessKey', { ID, status });
    return res.data?.value ?? res.data ?? [];
  }

  async function waitForInstances(
    ID: string,
    status: string[],
    expectedCount = 1,
    maxRetries = 15,
  ): Promise<any[]> {
    await new Promise((r) => setTimeout(r, 10000));
    for (let i = 0; i < maxRetries; i++) {
      const instances = await getInstances(ID, status);
      if (instances.length >= expectedCount) return instances;
      await new Promise((r) => setTimeout(r, 1000));
    }
    throw new Error(
      `Timed out waiting for ${expectedCount} instance(s) with status [${status}] for ID ${ID}`,
    );
  }

  async function getAttributes(ID: string): Promise<any[]> {
    const res = await POST('/odata/v4/programatical/getAttributes', { ID });
    return res.data?.value ?? res.data ?? [];
  }

  describe('Process Start', () => {
    it('should start a process and verify it is RUNNING on SBPA', async () => {
      const ID = generateID();
      const response = await startProcess(ID);

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('id');
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
      expect(instances[0]).toHaveProperty('definitionId');
    }, 40000);

    it('should start multiple independent processes', async () => {
      const idA = generateID();
      const idB = generateID();

      await startProcess(idA);
      await startProcess(idB);

      const instancesA = await waitForInstances(idA, ['RUNNING']);
      const instancesB = await waitForInstances(idB, ['RUNNING']);

      expect(instancesA.length).toBe(1);
      expect(instancesB.length).toBe(1);
      expect(instancesA[0].id).not.toEqual(instancesB[0].id);
    }, 50000);
  });

  describe('Process Suspend', () => {
    it('should suspend a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      const response = await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['SUSPENDED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'SUSPENDED');
    }, 50000);
  });

  describe('Process Resume', () => {
    it('should resume a suspended process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });
      await waitForInstances(ID, ['SUSPENDED']);

      const response = await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    }, 60000);
  });

  describe('Process Cancel', () => {
    it('should cancel a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      const response = await POST('/odata/v4/programatical/cancelProcess', { ID });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    }, 50000);
  });

  describe('Sequential lifecycle operations', () => {
    it('should go through start -> suspend -> resume and end up RUNNING', async () => {
      const ID = generateID();

      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });
      await waitForInstances(ID, ['SUSPENDED']);

      await POST('/odata/v4/programatical/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    }, 75000);

    it('should go through start -> cancel and end up CANCELED', async () => {
      const ID = generateID();

      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programatical/cancelProcess', { ID });

      const instances = await waitForInstances(ID, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    }, 50000);
  });

  describe('Get Attributes', () => {
    it('should return attributes for a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      const attributes = await getAttributes(ID);

      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBeGreaterThan(0);
      expect(attributes[0]).toHaveProperty('workflowId');
      expect(attributes[0]).toHaveProperty('attributes');
    }, 40000);

    it('should return an empty array when no process has been started', async () => {
      const ID = generateID();

      const attributes = await getAttributes(ID);

      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBe(0);
    }, 15000);
  });

  describe('Get Outputs', () => {
    async function startOutputProcess(
      ID: string,
      mandetory_date: string,
      mandetory_string: string,
      optional_string?: string,
      optional_date?: string,
    ) {
      return POST('/odata/v4/programatical/startForGetOutputs', {
        ID,
        mandetory_date,
        mandetory_string,
        optional_string,
        optional_date,
      });
    }

    async function getOutputInstances(ID: string, status?: string[]): Promise<any[]> {
      const res = await POST('/odata/v4/programatical/getInstanceIDForGetOutputs', { ID, status });
      return res.data?.value ?? res.data ?? [];
    }

    async function waitForOutputInstances(
      ID: string,
      status: string[],
      expectedCount = 1,
      maxRetries = 30,
    ): Promise<any[]> {
      await new Promise((r) => setTimeout(r, 10000));
      for (let i = 0; i < maxRetries; i++) {
        const instances = await getOutputInstances(ID, status);
        if (instances.length >= expectedCount) return instances;
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error(
        `Timed out waiting for ${expectedCount} output instance(s) with status [${status}] for ID ${ID}`,
      );
    }

    async function getOutputs(instanceId: string): Promise<any> {
      const res = await POST('/odata/v4/programatical/getOutputs', { instanceId });
      return res.data;
    }

    it('should retrieve outputs from a completed process', async () => {
      const ID = generateID();
      const mandetory_date = new Date().toISOString();
      const mandetory_string = 'test-output-string';

      await startOutputProcess(ID, mandetory_date, mandetory_string);

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('workflowId');

      const outputs = await getOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandetory_string');
      expect(outputs).toHaveProperty('mandetory_date');
      expect(outputs.mandetory_string).toBeDefined();
      expect(outputs.mandetory_date).toBeDefined();
    }, 70000);

    it('should return optional fields in outputs when provided', async () => {
      const ID = generateID();
      const mandetory_date = new Date().toISOString();
      const mandetory_string = 'test-mandatory';
      const optional_string = 'test-optional';
      const optional_date = new Date().toISOString();

      await startOutputProcess(
        ID,
        mandetory_date,
        mandetory_string,
        optional_string,
        optional_date,
      );

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);

      const outputs = await getOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandetory_string');
      expect(outputs).toHaveProperty('mandetory_date');
      expect(outputs).toHaveProperty('optional_string');
      expect(outputs).toHaveProperty('optional_date');
    }, 70000);
  });
});
