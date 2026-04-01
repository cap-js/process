/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, DELETE, PATCH } = cds.test(app);

describe('Integration tests for Process Annotations (Isolated)', () => {
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
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  // Helper function to create a test car entity
  const createTestCar = ({ id, mileage = 100 }: { id?: string; mileage?: number } = {}) => ({
    ID: id || cds.utils.uuid(),
    model: 'Test Model',
    manufacturer: 'Test Manufacturer',
    mileage,
    year: 2020,
  });

  // ================================================
  // START ANNOTATION TESTS
  // ================================================
  describe('Process START annotations', () => {
    describe('Start on CREATE', () => {
      it('should start process on CREATE without when condition', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/StartOnCreate', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnCreateProcess');
        expect(foundMessages[0].data.context).toBeDefined();
        expect(foundMessages[0].data.context).toEqual({
          ...car,
        });
      });

      it('should start process on CREATE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        const response = await POST('/odata/v4/annotation/StartOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnCreateWhenProcess');
        expect(foundMessages[0].data.context).toBeDefined();
        expect(foundMessages[0].data.context).toEqual({
          ...car,
        });
      });

      it('should NOT start process on CREATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        const response = await POST('/odata/v4/annotation/StartOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Start on UPDATE', () => {
      it('should start process on UPDATE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnUpdate', car);
        expect(createResponse.status).toBe(201);
        foundMessages = []; // Reset messages after create

        // Update the entity
        const updateResponse = await PATCH(`/odata/v4/annotation/StartOnUpdate('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnUpdateProcess');
        expect(foundMessages[0].data.context).toBeDefined();
      });

      it('should start process on UPDATE when condition is met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update to mileage > 500
        const updateResponse = await PATCH(`/odata/v4/annotation/StartOnUpdateWhen('${car.ID}')`, {
          mileage: 600,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(600);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnUpdateWhenProcess');
        expect(foundMessages[0].data.context).toBeDefined();
      });

      it('should NOT start process on UPDATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update but keep mileage <= 500
        const updateResponse = await PATCH(`/odata/v4/annotation/StartOnUpdateWhen('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Start on DELETE', () => {
      it('should start process on DELETE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnDelete', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/StartOnDelete('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnDeleteProcess');
        expect(foundMessages[0].data.context).toBeDefined();
      });

      it('should start process on DELETE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/StartOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data.definitionId).toBe('startOnDeleteWhenProcess');
        expect(foundMessages[0].data.context).toBeDefined();
      });

      it('should NOT start process on DELETE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/StartOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/StartOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(0);
      });
    });
  });

  // ================================================
  // CANCEL ANNOTATION TESTS
  // ================================================
  describe('Process CANCEL annotations', () => {
    describe('Cancel on CREATE', () => {
      it('should cancel process on CREATE without when condition', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/CancelOnCreate', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should cancel process on CREATE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        const response = await POST('/odata/v4/annotation/CancelOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT cancel process on CREATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        const response = await POST('/odata/v4/annotation/CancelOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Cancel on UPDATE', () => {
      it('should cancel process on UPDATE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnUpdate', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnUpdate('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should cancel process on UPDATE with cascade true when condition is met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update to mileage > 500
        const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnUpdateWhen('${car.ID}')`, {
          mileage: 600,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(600);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT cancel process on UPDATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update but keep mileage <= 500
        const updateResponse = await PATCH(`/odata/v4/annotation/CancelOnUpdateWhen('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Cancel on DELETE', () => {
      it('should cancel process on DELETE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnDelete', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/CancelOnDelete('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should cancel process on DELETE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/CancelOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT cancel process on DELETE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/CancelOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(0);
      });
    });
  });

  // ================================================
  // SUSPEND ANNOTATION TESTS
  // ================================================
  describe('Process SUSPEND annotations', () => {
    describe('Suspend on CREATE', () => {
      it('should suspend process on CREATE without when condition', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/SuspendOnCreate', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should suspend process on CREATE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        const response = await POST('/odata/v4/annotation/SuspendOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT suspend process on CREATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        const response = await POST('/odata/v4/annotation/SuspendOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Suspend on UPDATE', () => {
      it('should suspend process on UPDATE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnUpdate', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(`/odata/v4/annotation/SuspendOnUpdate('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should suspend process on UPDATE with cascade true when condition is met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update to mileage > 500
        const updateResponse = await PATCH(
          `/odata/v4/annotation/SuspendOnUpdateWhen('${car.ID}')`,
          {
            mileage: 600,
          },
        );

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(600);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT suspend process on UPDATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update but keep mileage <= 500
        const updateResponse = await PATCH(
          `/odata/v4/annotation/SuspendOnUpdateWhen('${car.ID}')`,
          {
            mileage: 200,
          },
        );

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Suspend on DELETE', () => {
      it('should suspend process on DELETE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnDelete', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/SuspendOnDelete('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should suspend process on DELETE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(
          `/odata/v4/annotation/SuspendOnDeleteWhen('${car.ID}')`,
        );

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT suspend process on DELETE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/SuspendOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(
          `/odata/v4/annotation/SuspendOnDeleteWhen('${car.ID}')`,
        );

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(0);
      });
    });
  });

  // ================================================
  // RESUME ANNOTATION TESTS
  // ================================================
  describe('Process RESUME annotations', () => {
    describe('Resume on CREATE', () => {
      it('should resume process on CREATE without when condition', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/ResumeOnCreate', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should resume process on CREATE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        const response = await POST('/odata/v4/annotation/ResumeOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT resume process on CREATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        const response = await POST('/odata/v4/annotation/ResumeOnCreateWhen', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Resume on UPDATE', () => {
      it('should resume process on UPDATE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnUpdate', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(`/odata/v4/annotation/ResumeOnUpdate('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should resume process on UPDATE with cascade true when condition is met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update to mileage > 500
        const updateResponse = await PATCH(`/odata/v4/annotation/ResumeOnUpdateWhen('${car.ID}')`, {
          mileage: 600,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(600);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT resume process on UPDATE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 100 });

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnUpdateWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update but keep mileage <= 500
        const updateResponse = await PATCH(`/odata/v4/annotation/ResumeOnUpdateWhen('${car.ID}')`, {
          mileage: 200,
        });

        expect(updateResponse.status).toBe(200);
        expect(updateResponse.data.mileage).toBe(200);

        expect(foundMessages.length).toBe(0);
      });
    });

    describe('Resume on DELETE', () => {
      it('should resume process on DELETE without when condition', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnDelete', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/ResumeOnDelete('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should resume process on DELETE when condition is met', async () => {
        const car = createTestCar({ mileage: 600 }); // mileage > 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/ResumeOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: true,
        });
      });

      it('should NOT resume process on DELETE when condition is NOT met', async () => {
        const car = createTestCar({ mileage: 400 }); // mileage <= 500

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnDeleteWhen', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(`/odata/v4/annotation/ResumeOnDeleteWhen('${car.ID}')`);

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(0);
      });
    });
  });

  // ================================================
  // DEFAULT CASCADE TESTS (cascade omitted, should default to false)
  // ================================================
  describe('Default cascade behavior (cascade annotation omitted)', () => {
    describe('Cancel with default cascade', () => {
      it('should cancel process on CREATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/CancelOnCreateDefaultCascade', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should cancel process on UPDATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnUpdateDefaultCascade', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(
          `/odata/v4/annotation/CancelOnUpdateDefaultCascade('${car.ID}')`,
          {
            mileage: 200,
          },
        );

        expect(updateResponse.status).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should cancel process on DELETE with cascade defaulting to false', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/CancelOnDeleteDefaultCascade', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Delete the entity
        const deleteResponse = await DELETE(
          `/odata/v4/annotation/CancelOnDeleteDefaultCascade('${car.ID}')`,
        );

        expect(deleteResponse.status).toBe(204);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });
    });

    describe('Suspend with default cascade', () => {
      it('should suspend process on CREATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/SuspendOnCreateDefaultCascade', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should suspend process on UPDATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST(
          '/odata/v4/annotation/SuspendOnUpdateDefaultCascade',
          car,
        );
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(
          `/odata/v4/annotation/SuspendOnUpdateDefaultCascade('${car.ID}')`,
          {
            mileage: 200,
          },
        );

        expect(updateResponse.status).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });
    });

    describe('Resume with default cascade', () => {
      it('should resume process on CREATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        const response = await POST('/odata/v4/annotation/ResumeOnCreateDefaultCascade', car);

        expect(response.status).toBe(201);
        expect(response.data.ID).toBe(car.ID);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });

      it('should resume process on UPDATE with cascade defaulting to false', async () => {
        const car = createTestCar();

        // First create the entity
        const createResponse = await POST('/odata/v4/annotation/ResumeOnUpdateDefaultCascade', car);
        expect(createResponse.status).toBe(201);
        foundMessages = [];

        // Update the entity
        const updateResponse = await PATCH(
          `/odata/v4/annotation/ResumeOnUpdateDefaultCascade('${car.ID}')`,
          {
            mileage: 200,
          },
        );

        expect(updateResponse.status).toBe(200);

        expect(foundMessages.length).toBe(1);
        expect(foundMessages[0].data).toEqual({
          businessKey: car.ID,
          cascade: false,
        });
      });
    });
  });
});
