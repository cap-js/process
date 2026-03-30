/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, DELETE, PATCH } = cds.test(app);

describe('Integration tests for multiple @bpm.process.start annotations', () => {
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
    foundMessages = [];
  });

  afterAll(async () => {
    await (cds as any).flush();
  });

  const createTestCar = ({ id, mileage = 100 }: { id?: string; mileage?: number } = {}) => ({
    ID: id || cds.utils.uuid(),
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  const findStartMessages = () => foundMessages.filter((msg) => msg.event === 'start');

  // ================================================
  // Two starts on CREATE
  // ================================================
  describe('Two starts on CREATE', () => {
    it('should trigger both start annotations on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/MultiStartOnCreate', car);

      expect(response.status).toBe(201);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(2);

      const definitionIds = startMsgs.map((m: any) => m.data.definitionId).sort();
      expect(definitionIds).toEqual(['multiStartCreateProcess1', 'multiStartCreateProcess2']);
    });
  });

  // ================================================
  // Two starts on different events
  // ================================================
  describe('Two starts on different events (CREATE + UPDATE)', () => {
    it('should trigger only the CREATE annotation on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/MultiStartDiffEvents', car);

      expect(response.status).toBe(201);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(1);
      expect(startMsgs[0].data.definitionId).toBe('multiStartDiffEventProcess1');
    });

    it('should trigger only the UPDATE annotation on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiStartDiffEvents', car);
      foundMessages = [];

      const response = await PATCH(`/odata/v4/annotation/MultiStartDiffEvents('${car.ID}')`, {
        mileage: 200,
      });

      expect(response.status).toBe(200);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(1);
      expect(startMsgs[0].data.definitionId).toBe('multiStartDiffEventProcess2');
    });
  });

  // ================================================
  // Two starts on DELETE
  // ================================================
  describe('Two starts on DELETE', () => {
    it('should trigger both start annotations on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/MultiStartOnDelete', car);
      foundMessages = [];

      const response = await DELETE(`/odata/v4/annotation/MultiStartOnDelete('${car.ID}')`);

      expect(response.status).toBe(204);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(2);

      const definitionIds = startMsgs.map((m: any) => m.data.definitionId).sort();
      expect(definitionIds).toEqual(['multiStartDeleteProcess1', 'multiStartDeleteProcess2']);
    });
  });

  // ================================================
  // Two starts on CREATE with different business keys
  // ================================================
  describe('Two starts on CREATE with different business keys', () => {
    it('should trigger both starts with their respective business keys', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/MultiStartDiffBusinessKeys', car);

      expect(response.status).toBe(201);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(2);

      // Find each start message by definitionId
      const msg1 = startMsgs.find((m: any) => m.data.definitionId === 'multiStartBkProcess1');
      const msg2 = startMsgs.find((m: any) => m.data.definitionId === 'multiStartBkProcess2');

      expect(msg1).toBeDefined();
      expect(msg2).toBeDefined();

      // Unqualified start: @bpm.process.businessKey: (ID)
      expect(msg1!.headers.businessKey).toBe(car.ID);

      // Qualified start #two: @bpm.process.businessKey#two: (model || '-' || manufacturer)
      expect(msg2!.headers.businessKey).toBe(`${car.model}-${car.manufacturer}`);
    });
  });

  // ================================================
  // Two starts on CREATE, one with a condition
  // ================================================
  describe('Two starts on CREATE with condition', () => {
    it('should trigger only the unconditional start when condition is NOT met', async () => {
      const car = createTestCar({ mileage: 100 }); // mileage <= 500, condition not met

      const response = await POST('/odata/v4/annotation/MultiStartWithCondition', car);

      expect(response.status).toBe(201);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(1);
      expect(startMsgs[0].data.definitionId).toBe('multiStartIfProcess1');
    });

    it('should trigger both starts when condition IS met', async () => {
      const car = createTestCar({ mileage: 600 }); // mileage > 500, condition met

      const response = await POST('/odata/v4/annotation/MultiStartWithCondition', car);

      expect(response.status).toBe(201);

      const startMsgs = findStartMessages();
      expect(startMsgs.length).toBe(2);

      const definitionIds = startMsgs.map((m: any) => m.data.definitionId).sort();
      expect(definitionIds).toEqual(['multiStartIfProcess1', 'multiStartIfProcess2']);
    });
  });
});
