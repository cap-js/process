/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { POST } = cds.test(app);

const DEFINITION_ID = 'eu12.cdsmunich.capprocesspluginhybridtest.programmatic_Lifecycle_Process';

describe('getInstances Integration Tests', () => {
  afterAll(async () => {
    await (cds as any).flush();
    await new Promise((resolve) => setTimeout(resolve, 5000));
  });

  function generateID(): string {
    return cds.utils.uuid();
  }

  // Start a process directly via ProcessService (synchronous, bypasses outbox)
  async function startProcess(businessKey: string) {
    const processService = await cds.connect.to('ProcessService');
    await processService.send(
      'start',
      { definitionId: DEFINITION_ID, context: { ID: businessKey } },
      { businessKey },
    );
  }

  // Query via programmatic getInstances action (businessKey mapped as ID + status + top/skip)
  async function getInstances(params: Record<string, unknown>): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/getInstances', params);
    return res.data?.value ?? res.data ?? [];
  }

  // Query via genericGetInstances which passes all params directly to ProcessService
  async function genericGetInstances(params: Record<string, unknown>): Promise<any[]> {
    const res = await POST('/odata/v4/programmatic/genericGetInstances', params);
    return res.data?.value ?? res.data ?? [];
  }

  describe('filter by businessKey', () => {
    it('returns instances matching businessKey', async () => {
      const ID = generateID();
      await startProcess(ID);

      const instances = await getInstances({ ID });
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('returns empty array for unknown businessKey', async () => {
      const instances = await getInstances({ ID: generateID() });
      expect(instances).toHaveLength(0);
    });
  });

  describe('filter by status', () => {
    it('returns instance when status matches', async () => {
      const ID = generateID();
      await startProcess(ID);

      const instances = await getInstances({ ID, status: ['RUNNING'] });
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('returns empty array when status does not match', async () => {
      const ID = generateID();
      await startProcess(ID);

      const instances = await getInstances({ ID, status: ['SUSPENDED'] });
      expect(instances).toHaveLength(0);
    });

    it('returns instance when one of multiple statuses matches', async () => {
      const ID = generateID();
      await startProcess(ID);

      const instances = await getInstances({ ID, status: ['RUNNING', 'SUSPENDED'] });
      expect(instances.length).toBe(1);
    });
  });

  describe('pagination', () => {
    it('respects top parameter', async () => {
      const idA = generateID();
      const idB = generateID();
      await startProcess(idA);
      await startProcess(idB);

      const all = await getInstances({ status: ['RUNNING'] });
      const paged = await getInstances({ status: ['RUNNING'], top: 1 });

      expect(all.length).toBeGreaterThanOrEqual(2);
      expect(paged.length).toBe(1);
    });

    it('respects skip parameter', async () => {
      const idA = generateID();
      const idB = generateID();
      await startProcess(idA);
      await startProcess(idB);

      const all = await getInstances({ status: ['RUNNING'] });
      const skipped = await getInstances({ status: ['RUNNING'], skip: 1 });

      expect(skipped.length).toBe(all.length - 1);
    });
  });

  describe('generic getInstances with direct params', () => {
    it('filters by businessKey and status', async () => {
      const ID = generateID();
      await startProcess(ID);

      const instances = await genericGetInstances({ businessKey: ID, status: ['RUNNING'] });
      expect(instances.length).toBe(1);
      expect(instances[0]).toHaveProperty('status', 'RUNNING');
    });

    it('returns empty when no match', async () => {
      const instances = await genericGetInstances({ businessKey: generateID() });
      expect(instances).toHaveLength(0);
    });
  });
});
