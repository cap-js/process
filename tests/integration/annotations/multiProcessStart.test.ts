/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST, PATCH } = cds.test(app);

describe('Integration tests for Multi-Process Start (#-qualifier syntax)', () => {
  let foundMessages: any[] = [];

  beforeAll(async () => {
    const db = await cds.connect.to('db');
    db.before('*', (req) => {
      if (req.event === 'CREATE' && req.target?.name === 'cds.outbox.Messages') {
        const msg = JSON.parse(req.query?.INSERT?.entries[0].msg);
        foundMessages.push(msg);
      }
    });
  });

  beforeEach(async () => {
    await test.data.reset();
    foundMessages = [];
  });

  const createTestCar = (id?: string, mileage: number = 100) => ({
    ID: id || '550e8400-e29b-41d4-a716-446655440000',
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  // ================================================
  // MultiStartOnDifferentEvents
  // #create → 'multiStartCreateProcess' on CREATE
  // #update → 'multiStartUpdateProcess' on UPDATE
  // ================================================
  describe('Two processes on different events', () => {
    it('should start only the CREATE process on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/MultiStartOnDifferentEvents', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('multiStartCreateProcess');
      expect(foundMessages[0].data.context.businesskey).toBe(car.ID);
    });

    it('should start only the UPDATE process on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiStartOnDifferentEvents', car);
      foundMessages = [];

      const updateResponse = await PATCH(
        `/odata/v4/annotation/MultiStartOnDifferentEvents('${car.ID}')`,
        { mileage: 200 },
      );

      expect(updateResponse.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('multiStartUpdateProcess');
      expect(foundMessages[0].data.context.businesskey).toBe(car.ID);
    });
  });

  // ================================================
  // MultiStartOnSameEvent
  // #first  → 'multiStartFirst'  on CREATE
  // #second → 'multiStartSecond' on CREATE
  // ================================================
  describe('Two processes on the same event', () => {
    it('should start both processes on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/MultiStartOnSameEvent', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(2);

      const definitionIds = foundMessages.map((m) => m.data.definitionId);
      expect(definitionIds).toContain('multiStartFirst');
      expect(definitionIds).toContain('multiStartSecond');

      for (const msg of foundMessages) {
        expect(msg.data.context.businesskey).toBe(car.ID);
      }
    });
  });

  // ================================================
  // MultiStartWithCondition
  // #always      → 'multiStartAlways'      on CREATE (no condition)
  // #conditional → 'multiStartConditional' on CREATE (if mileage > 500)
  // ================================================
  describe('Two processes on CREATE, one conditional', () => {
    it('should start both processes when condition is met (mileage > 500)', async () => {
      const car = createTestCar(undefined, 600);

      const response = await POST('/odata/v4/annotation/MultiStartWithCondition', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(2);

      const definitionIds = foundMessages.map((m) => m.data.definitionId);
      expect(definitionIds).toContain('multiStartAlways');
      expect(definitionIds).toContain('multiStartConditional');
    });

    it('should start only the unconditional process when condition is NOT met (mileage <= 500)', async () => {
      const car = createTestCar(undefined, 400);

      const response = await POST('/odata/v4/annotation/MultiStartWithCondition', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('multiStartAlways');
    });
  });
});
