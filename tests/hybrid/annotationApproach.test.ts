/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST, DELETE, PATCH } = cds.test(app);

describe('Annotation Approach Hybrid Tests', () => {
  function generateID(): string {
    return cds.utils.uuid();
  }

  async function getInstances(ID: string, status?: string[]): Promise<any[]> {
    const res = await POST('/odata/v4/annotation-hybrid/getInstancesByBusinessKey', { ID, status });
    return res.data?.value ?? res.data ?? [];
  }

  async function waitForInstances(
    ID: string,
    status: string[],
    expectedCount = 1,
    timeoutMs = 15000,
    intervalMs = 1000,
  ): Promise<any[]> {
    await new Promise((r) => setTimeout(r, 5000));
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const instances = await getInstances(ID, status);
      if (instances.length >= expectedCount) return instances;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(
      `Timed out waiting for ${expectedCount} instance(s) with status [${status}] for ID ${ID}`,
    );
  }

  it('should go through start -> suspend -> resume and end up RUNNING', async () => {
    const ID = generateID();

    // CREATE triggers start
    await POST('/odata/v4/annotation-hybrid/FullLifecycle', {
      ID,
      model: 'Test Model',
      manufacturer: 'Test Manufacturer',
      mileage: 100,
      year: 2020,
    });

    const runningInstances = await waitForInstances(ID, ['RUNNING']);
    expect(runningInstances.length).toBe(1);
    expect(runningInstances[0]).toHaveProperty('status', 'RUNNING');

    // UPDATE mileage > 800 triggers suspend
    await PATCH(`/odata/v4/annotation-hybrid/FullLifecycle('${ID}')`, { mileage: 900 });

    const suspendedInstances = await waitForInstances(ID, ['SUSPENDED']);
    expect(suspendedInstances.length).toBe(1);
    expect(suspendedInstances[0]).toHaveProperty('status', 'SUSPENDED');

    // UPDATE mileage <= 800 triggers resume
    await PATCH(`/odata/v4/annotation-hybrid/FullLifecycle('${ID}')`, { mileage: 500 });

    const resumedInstances = await waitForInstances(ID, ['RUNNING']);
    expect(resumedInstances.length).toBe(1);
    expect(resumedInstances[0]).toHaveProperty('status', 'RUNNING');
  }, 75000);

  it('should go through start -> cancel and end up CANCELED', async () => {
    const ID = generateID();

    // CREATE triggers start
    await POST('/odata/v4/annotation-hybrid/FullLifecycle', {
      ID,
      model: 'Test Model',
      manufacturer: 'Test Manufacturer',
      mileage: 100,
      year: 2020,
    });

    const runningInstances = await waitForInstances(ID, ['RUNNING']);
    expect(runningInstances.length).toBe(1);
    expect(runningInstances[0]).toHaveProperty('status', 'RUNNING');

    // DELETE triggers cancel
    await DELETE(`/odata/v4/annotation-hybrid/FullLifecycle('${ID}')`);

    const canceledInstances = await waitForInstances(ID, ['CANCELED']);
    expect(canceledInstances.length).toBe(1);
    expect(canceledInstances[0]).toHaveProperty('status', 'CANCELED');
  }, 55000);
});
