/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, PATCH, DELETE } = cds.test(app);

describe('Integration tests for Process Annotations with Wildcard Event (*)', () => {
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

  // Helper function to create a test car entity
  const createTestCar = (id?: string, mileage: number = 100) => ({
    ID: id || cds.utils.uuid(),
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  // ================================================
  // START ON WILDCARD TESTS
  // ================================================
  describe('Process START on wildcard (*)', () => {
    it('should start process on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/StartOnWildcard', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardProcess');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context).toEqual({
        ...car,
      });
    });

    it('should start process on UPDATE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity
      const updateResponse = await PATCH(`/odata/v4/annotation/StartOnWildcard('${car.ID}')`, {
        mileage: 200,
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should start process on DELETE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Delete the entity
      const deleteResponse = await DELETE(`/odata/v4/annotation/StartOnWildcard('${car.ID}')`);
      expect(deleteResponse.status).toBe(204);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should start process on bound action', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnWildcard('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });
  });

  // ================================================
  // START ON WILDCARD WITH CONDITION TESTS
  // ================================================
  describe('Process START on wildcard (*) with condition', () => {
    it('should start process on CREATE when condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      const response = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardWhenProcess');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context).toEqual({
        ...car,
      });
    });

    it('should NOT start process on CREATE when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      const response = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(0);
    });

    it('should start process on UPDATE when condition is met', async () => {
      const car = createTestCar(undefined, 400); // Start with mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity to meet condition
      const updateResponse = await PATCH(`/odata/v4/annotation/StartOnWildcardWhen('${car.ID}')`, {
        mileage: 600, // Now mileage > 500
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardWhenProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should NOT start process on UPDATE when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity but keep mileage low
      const updateResponse = await PATCH(`/odata/v4/annotation/StartOnWildcardWhen('${car.ID}')`, {
        mileage: 450, // Still mileage <= 500
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });

    it('should start process on bound action when condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnWildcardWhen('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnWildcardWhenProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should NOT start process on bound action when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/StartOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/StartOnWildcardWhen('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });

  // ================================================
  // CANCEL ON WILDCARD TESTS
  // ================================================
  describe('Process CANCEL on wildcard (*)', () => {
    it('should cancel process on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/CancelOnWildcard', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should cancel process on UPDATE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity
      const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnWildcard('${car.ID}')`, {
        mileage: 200,
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should cancel process on DELETE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Delete the entity
      const deleteResponse = await DELETE(`/odata/v4/annotation/CancelOnWildcard('${car.ID}')`);
      expect(deleteResponse.status).toBe(204);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should cancel process on bound action', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnWildcard('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // SUSPEND ON WILDCARD TESTS
  // ================================================
  describe('Process SUSPEND on wildcard (*)', () => {
    it('should suspend process on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/SuspendOnWildcard', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should suspend process on UPDATE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity
      const updateResponse = await PATCH(`/odata/v4/annotation/SuspendOnWildcard('${car.ID}')`, {
        mileage: 200,
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should suspend process on DELETE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Delete the entity
      const deleteResponse = await DELETE(`/odata/v4/annotation/SuspendOnWildcard('${car.ID}')`);
      expect(deleteResponse.status).toBe(204);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should suspend process on bound action', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/SuspendOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/SuspendOnWildcard('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // RESUME ON WILDCARD TESTS
  // ================================================
  describe('Process RESUME on wildcard (*)', () => {
    it('should resume process on CREATE', async () => {
      const car = createTestCar();

      const response = await POST('/odata/v4/annotation/ResumeOnWildcard', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should resume process on UPDATE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity
      const updateResponse = await PATCH(`/odata/v4/annotation/ResumeOnWildcard('${car.ID}')`, {
        mileage: 200,
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should resume process on DELETE', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Delete the entity
      const deleteResponse = await DELETE(`/odata/v4/annotation/ResumeOnWildcard('${car.ID}')`);
      expect(deleteResponse.status).toBe(204);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });

    it('should resume process on bound action', async () => {
      const car = createTestCar();

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/ResumeOnWildcard', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/ResumeOnWildcard('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: false,
      });
    });
  });

  // ================================================
  // WILDCARD WITH CONDITION TESTS
  // ================================================
  describe('Process CANCEL on wildcard (*) with condition', () => {
    it('should cancel process on CREATE when condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      const response = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT cancel process on CREATE when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      const response = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(response.status).toBe(201);

      expect(foundMessages.length).toBe(0);
    });

    it('should cancel process on UPDATE when condition is met', async () => {
      const car = createTestCar(undefined, 400); // Start with mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity to meet condition
      const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnWildcardWhen('${car.ID}')`, {
        mileage: 600, // Now mileage > 500
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT cancel process on UPDATE when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Update the entity but keep mileage low
      const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnWildcardWhen('${car.ID}')`, {
        mileage: 450, // Still mileage <= 500
      });
      expect(updateResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });

    it('should cancel process on bound action when condition is met', async () => {
      const car = createTestCar(undefined, 600); // mileage > 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnWildcardWhen('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data).toEqual({
        businessKey: car.ID,
        cascade: true,
      });
    });

    it('should NOT cancel process on bound action when condition is NOT met', async () => {
      const car = createTestCar(undefined, 400); // mileage <= 500

      // First create the entity
      const createResponse = await POST('/odata/v4/annotation/CancelOnWildcardWhen', car);
      expect(createResponse.status).toBe(201);
      foundMessages = []; // Reset messages after create

      // Call the bound action
      const actionResponse = await POST(
        `/odata/v4/annotation/CancelOnWildcardWhen('${car.ID}')/triggerAction`,
      );
      expect(actionResponse.status).toBe(200);

      expect(foundMessages.length).toBe(0);
    });
  });
});
