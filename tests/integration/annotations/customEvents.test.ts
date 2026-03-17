/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST } = cds.test(app);

describe('Integration tests for Process Annotations with Custom Events (Bound Actions)', () => {
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

  // Helper function to create a test car entity
  const createTestCar = (id?: string, mileage: number = 100) => ({
    ID: id || cds.utils.uuid(),
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  // ================================================
  // START ANNOTATION TESTS - Bound Actions
  // ================================================
  describe('Process START on bound action', () => {
    it('should start process when bound action is called', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnAction', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnAction('${car.ID}')/triggerStart`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnActionProcess');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context).toEqual({
        ...car,
      });
    });

    it('should start process when bound action is called and condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnActionWhen('${car.ID}')/triggerStartWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnActionWhenProcess');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context).toEqual({
        ...car,
      });
    });

    it('should NOT start process when bound action is called and condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnActionWhen('${car.ID}')/triggerStartWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });

  // ================================================
  // CANCEL ANNOTATION TESTS - Bound Actions
  // ================================================
  describe('Process CANCEL on bound action', () => {
    it('should cancel process when bound action is called', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnAction', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnAction('${car.ID}')/triggerCancel`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should cancel process when bound action is called and condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnActionWhen('${car.ID}')/triggerCancelWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT cancel process when bound action is called and condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnActionWhen('${car.ID}')/triggerCancelWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });

  // ================================================
  // SUSPEND ANNOTATION TESTS - Bound Actions
  // ================================================
  describe('Process SUSPEND on bound action', () => {
    it('should suspend process when bound action is called', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnAction', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/SuspendOnAction('${car.ID}')/triggerSuspend`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should suspend process when bound action is called and condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/SuspendOnActionWhen('${car.ID}')/triggerSuspendWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT suspend process when bound action is called and condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/SuspendOnActionWhen('${car.ID}')/triggerSuspendWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });

  // ================================================
  // RESUME ANNOTATION TESTS - Bound Actions
  // ================================================
  describe('Process RESUME on bound action', () => {
    it('should resume process when bound action is called', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnAction', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/ResumeOnAction('${car.ID}')/triggerResume`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should resume process when bound action is called and condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/ResumeOnActionWhen('${car.ID}')/triggerResumeWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT resume process when bound action is called and condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnActionWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/ResumeOnActionWhen('${car.ID}')/triggerResumeWhen`,
      );

      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });
});
