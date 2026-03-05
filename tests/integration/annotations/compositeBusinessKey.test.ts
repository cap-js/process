/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST, DELETE, PATCH } = cds.test(app);

describe('Integration tests for Composite Business Key', () => {
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

  // Helper function to create a test car entity
  const createTestCar = (id?: string, mileage: number = 100) => ({
    ID: id || '550e8400-e29b-41d4-a716-446655440000',
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  const findMessagesByEvent = (eventName: string) =>
    foundMessages.filter((msg) => msg.event === eventName);
  const findCancelMessages = () => findMessagesByEvent('cancel');
  const findSuspendMessages = () => findMessagesByEvent('suspend');
  const findResumeMessages = () => findMessagesByEvent('resume');

  // ================================================
  // CANCEL WITH COMPOSITE BUSINESS KEY
  // businessKey: (concat(model, concat('-', manufacturer)))
  // ================================================
  describe('Cancel with composite businessKey (model-manufacturer)', () => {
    it('should cancel with concatenated businessKey on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/CancelCompositeKey', car);

      foundMessages = [];

      await DELETE(`/odata/v4/annotation/CancelCompositeKey('${car.ID}')`);

      const cancelMessages = findCancelMessages();
      expect(cancelMessages.length).toBe(1);
      expect(cancelMessages[0].data).toEqual({
        businessKey: `${car.model}-${car.manufacturer}`,
        cascade: false,
      });
    });
  });

  // ================================================
  // SUSPEND WITH COMPOSITE BUSINESS KEY
  // businessKey: (concat(manufacturer, concat('_', model)))
  // ================================================
  describe('Suspend with composite businessKey (manufacturer_model)', () => {
    it('should suspend with concatenated businessKey on UPDATE when condition met', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/SuspendCompositeKey', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/SuspendCompositeKey('${car.ID}')`, {
        mileage: 600, // mileage > 500
      });

      const suspendMessages = findSuspendMessages();
      expect(suspendMessages.length).toBe(1);
      expect(suspendMessages[0].data).toEqual({
        businessKey: `${car.manufacturer}_${car.model}`,
        cascade: false,
      });
    });

    it('should NOT suspend when condition is NOT met', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/SuspendCompositeKey', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/SuspendCompositeKey('${car.ID}')`, {
        mileage: 400, // mileage <= 500
      });

      const suspendMessages = findSuspendMessages();
      expect(suspendMessages.length).toBe(0);
    });
  });

  // ================================================
  // RESUME WITH COMPOSITE BUSINESS KEY
  // businessKey: (concat(manufacturer, concat('_', model)))
  // ================================================
  describe('Resume with composite businessKey (manufacturer_model)', () => {
    it('should resume with concatenated businessKey on UPDATE when condition met', async () => {
      const car = createTestCar(undefined, 600);

      await POST('/odata/v4/annotation/ResumeCompositeKey', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/ResumeCompositeKey('${car.ID}')`, {
        mileage: 400, // mileage <= 500
      });

      const resumeMessages = findResumeMessages();
      expect(resumeMessages.length).toBe(1);
      expect(resumeMessages[0].data).toEqual({
        businessKey: `${car.manufacturer}_${car.model}`,
        cascade: false,
      });
    });

    it('should NOT resume when condition is NOT met', async () => {
      const car = createTestCar(undefined, 600);

      await POST('/odata/v4/annotation/ResumeCompositeKey', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/ResumeCompositeKey('${car.ID}')`, {
        mileage: 700, // mileage > 500
      });

      const resumeMessages = findResumeMessages();
      expect(resumeMessages.length).toBe(0);
    });
  });

  // ================================================
  // FULL LIFECYCLE WITH COMPOSITE BUSINESS KEY
  // businessKey: (concat(model, concat('/', manufacturer)))
  // ================================================
  describe('Full lifecycle with composite businessKey (model/manufacturer)', () => {
    it('should start process on CREATE (no businessKey in start context)', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/CompositeKeyLifecycle', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('compositeKeyLifecycleProcess');
    });

    it('should suspend with composite businessKey on UPDATE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/CompositeKeyLifecycle', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/CompositeKeyLifecycle('${car.ID}')`, {
        mileage: 600, // mileage > 500
      });

      const suspendMessages = findSuspendMessages();
      expect(suspendMessages.length).toBe(1);
      expect(suspendMessages[0].data).toEqual({
        businessKey: `${car.model}/${car.manufacturer}`,
        cascade: false,
      });
    });

    it('should resume with composite businessKey on UPDATE', async () => {
      const car = createTestCar(undefined, 600);

      await POST('/odata/v4/annotation/CompositeKeyLifecycle', car);

      foundMessages = [];

      await PATCH(`/odata/v4/annotation/CompositeKeyLifecycle('${car.ID}')`, {
        mileage: 400, // mileage <= 500
      });

      const resumeMessages = findResumeMessages();
      expect(resumeMessages.length).toBe(1);
      expect(resumeMessages[0].data).toEqual({
        businessKey: `${car.model}/${car.manufacturer}`,
        cascade: false,
      });
    });

    it('should cancel with composite businessKey on DELETE', async () => {
      const car = createTestCar();

      await POST('/odata/v4/annotation/CompositeKeyLifecycle', car);

      foundMessages = [];

      await DELETE(`/odata/v4/annotation/CompositeKeyLifecycle('${car.ID}')`);

      const cancelMessages = findCancelMessages();
      expect(cancelMessages.length).toBe(1);
      expect(cancelMessages[0].data).toEqual({
        businessKey: `${car.model}/${car.manufacturer}`,
        cascade: true,
      });
    });
  });
});
