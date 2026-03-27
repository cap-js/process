/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-await-in-loop */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

describe('Programmatic Approach Hybrid Tests', () => {
  // beforeEach(async () => {
  //   await test.data.reset();
  // });

  function generateID(): string {
    return cds.utils.uuid();
  }

  async function startProcess(ID: string) {
    return POST('/odata/v4/programmatic/startLifeCycleProcess', { ID });
  }

  async function getInstances(ID: string, status?: string[]): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/getInstancesByBusinessKey', { ID, status });
    return res.data?.value ?? res.data ?? [];
  }

  async function waitForInstances(
    ID: string,
    status: string[],
    expectedCount = 1,
    maxRetries = 6,
  ): Promise<any[]> {
    for (let i = 0; i < maxRetries; i++) {
      const instances = await getInstances(ID, status);
      if (instances.length >= expectedCount) return instances;
      await new Promise((r) => setTimeout(r, 10000));
    }
    throw new Error(
      `Timed out waiting for ${expectedCount} instance(s) with status [${status}] for ID ${ID}`,
    );
  }

  async function startOutputProcess(
    ID: string,
    mandatory_datetime: string,
    mandatory_string: string,
    optional_string?: string,
    optional_datetime?: string,
  ) {
    return POST('/odata/v4/programmatic/startForGetOutputs', {
      ID,
      mandatory_datetime,
      mandatory_string,
      optional_string,
      optional_datetime,
    });
  }

  async function getOutputInstances(ID: string, status?: string[]): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/getInstanceIDForGetOutputs', { ID, status });
    return res.data?.value ?? res.data ?? [];
  }

  async function waitForOutputInstances(
    ID: string,
    status: string[],
    expectedCount = 1,
    maxRetries = 8,
  ): Promise<any[]> {
    for (let i = 0; i < maxRetries; i++) {
      const instances = await getOutputInstances(ID, status);
      if (instances.length >= expectedCount) return instances;
      await new Promise((r) => setTimeout(r, 10000));
    }
    throw new Error(
      `Timed out waiting for ${expectedCount} output instance(s) with status [${status}] for ID ${ID}`,
    );
  }

  async function getAttributes(ID: string): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/getAttributes', { ID });
    return res.data?.value ?? res.data ?? [];
  }

  async function getOutputs(instanceId: string): Promise<any> {
    const res = await POST('/odata/v4/programmatic/getOutputs', { instanceId });
    return res.data;
  }

  async function genericGetAttributes(processInstanceId: string): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/genericGetAttributes', { processInstanceId });
    return res.data?.value ?? res.data ?? [];
  }

  async function genericGetOutputs(processInstanceId: string): Promise<any> {
    const res = await POST('/odata/v4/programmatic/genericGetOutputs', { processInstanceId });
    return res.data;
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
    });

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
    });
  });

  describe('Process Suspend', () => {
    it('should suspend a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      const response = await POST('/odata/v4/programmatic/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['SUSPENDED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'SUSPENDED');
    });
  });

  describe('Process Resume', () => {
    it('should resume a suspended process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programmatic/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });
      await waitForInstances(ID, ['SUSPENDED']);

      const response = await POST('/odata/v4/programmatic/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });
  });

  describe('Process Cancel', () => {
    it('should cancel a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      const response = await POST('/odata/v4/programmatic/cancelProcess', { ID });

      expect(response.status).toBe(204);

      const instances = await waitForInstances(ID, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should go through start -> suspend -> resume and end up RUNNING', async () => {
      const ID = generateID();

      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programmatic/updateProcess', {
        ID,
        newStatus: 'SUSPEND',
      });
      await waitForInstances(ID, ['SUSPENDED']);

      await POST('/odata/v4/programmatic/updateProcess', {
        ID,
        newStatus: 'RESUME',
      });

      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('should go through start -> cancel and end up CANCELED', async () => {
      const ID = generateID();

      await startProcess(ID);
      await waitForInstances(ID, ['RUNNING']);

      await POST('/odata/v4/programmatic/cancelProcess', { ID });

      const instances = await waitForInstances(ID, ['CANCELED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'CANCELED');
    });
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
    });

    it('should return an empty array when no process has been started', async () => {
      const ID = generateID();

      const attributes = await getAttributes(ID);

      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBe(0);
    });
  });

  describe('Get Outputs', () => {
    it('should retrieve outputs from a completed process', async () => {
      const ID = generateID();
      const mandatory_datetime = new Date().toISOString();
      const mandatory_string = 'test-output-string';

      await startOutputProcess(ID, mandatory_datetime, mandatory_string);

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('workflowId');

      const outputs = await getOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandatory_string');
      expect(outputs).toHaveProperty('mandatory_datetime');
      expect(outputs.mandatory_string).toBeDefined();
      expect(outputs.mandatory_datetime).toBeDefined();
    });

    it('should return optional fields in outputs when provided', async () => {
      const ID = generateID();
      const mandatory_datetime = new Date().toISOString();
      const mandatory_string = 'test-mandatory';
      const optional_string = 'test-optional';
      const optional_datetime = new Date().toISOString();

      await startOutputProcess(
        ID,
        mandatory_datetime,
        mandatory_string,
        optional_string,
        optional_datetime,
      );

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);

      const outputs = await getOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandatory_string');
      expect(outputs).toHaveProperty('mandatory_datetime');
      expect(outputs).toHaveProperty('optional_string');
      expect(outputs).toHaveProperty('optional_datetime');
    });
  });

  describe('Generic Get Attributes', () => {
    it('should return attributes for a running process', async () => {
      const ID = generateID();
      await startProcess(ID);
      const instances = await waitForInstances(ID, ['RUNNING']);
      expect(instances.length).toBe(1);

      const attributes = await genericGetAttributes(instances[0].id);

      expect(Array.isArray(attributes)).toBe(true);
      expect(attributes.length).toBeGreaterThan(0);
      expect(attributes[0]).toHaveProperty('id');
      expect(attributes[0]).toHaveProperty('value');
      expect(attributes[0]).toHaveProperty('type');
    });
  });

  describe('Generic Get Outputs', () => {
    it('should retrieve outputs from a completed process', async () => {
      const ID = generateID();
      const mandatory_datetime = new Date().toISOString();
      const mandatory_string = 'test-output-string';

      await startOutputProcess(ID, mandatory_datetime, mandatory_string);

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('workflowId');

      const outputs = await genericGetOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandatory_string');
      expect(outputs).toHaveProperty('mandatory_datetime');
      expect(outputs.mandatory_string).toBeDefined();
      expect(outputs.mandatory_datetime).toBeDefined();
    });

    it('should return optional fields in outputs when provided', async () => {
      const ID = generateID();
      const mandatory_datetime = new Date().toISOString();
      const mandatory_string = 'test-mandatory';
      const optional_string = 'test-optional';
      const optional_datetime = new Date().toISOString();

      await startOutputProcess(
        ID,
        mandatory_datetime,
        mandatory_string,
        optional_string,
        optional_datetime,
      );

      const instances = await waitForOutputInstances(ID, ['COMPLETED']);
      expect(instances.length).toBe(1);

      const outputs = await genericGetOutputs(instances[0].workflowId);

      expect(outputs).toHaveProperty('mandatory_string');
      expect(outputs).toHaveProperty('mandatory_datetime');
      expect(outputs).toHaveProperty('optional_string');
      expect(outputs).toHaveProperty('optional_datetime');
    });
  });
});
