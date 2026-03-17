/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST, DELETE, PATCH } = cds.test(app);

const BUSINESS_KEY_MAX_LENGTH = 255;

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

describe('Integration tests for Business Key Length Validation on processStart', () => {
  // ================================================
  // START ON CREATE - businessKey length validation
  // ================================================
  describe.only('Start on CREATE with businessKey length validation', () => {
    it.only('should start process when businessKey is well under 255 characters', async () => {
      const car = {
        ID: cds.utils.uuid(),
        model: 'Test Model',
        manufacturer: 'Test Manufacturer',
        mileage: 100,
        year: 2020,
      };

      const response = await POST('/odata/v4/annotation/StartWithShortBusinessKey', car);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startShortBusinessKeyProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should start process when businessKey is exactly 255 characters', async () => {
      const exactLengthValue = 'a'.repeat(BUSINESS_KEY_MAX_LENGTH);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440001',
        longValue: exactLengthValue,
        name: 'Test',
      };

      const response = await POST('/odata/v4/annotation/StartWithExactLimitBusinessKey', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startExactLimitBusinessKeyProcess');
      expect(foundMessages[0].data.context).toBeDefined();
    });

    it('should reject with 400 when businessKey exceeds 255 characters', async () => {
      const exceedingValue = 'a'.repeat(BUSINESS_KEY_MAX_LENGTH + 1);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440002',
        longValue: exceedingValue,
        name: 'Test',
      };

      try {
        await POST('/odata/v4/annotation/StartWithExceedingBusinessKey', entity);
        fail('Expected request to be rejected');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain(
          `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters`,
        );
      }

      expect(foundMessages.length).toBe(0);
    });

    it('should reject with 400 when businessKey is significantly over the limit', async () => {
      const longValue = 'x'.repeat(300);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440003',
        longValue,
        name: 'Test',
      };

      try {
        await POST('/odata/v4/annotation/StartWithExceedingBusinessKey', entity);
        fail('Expected request to be rejected');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain(
          `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters`,
        );
      }

      expect(foundMessages.length).toBe(0);
    });
  });

  // ================================================
  // START ON DELETE - businessKey length validation
  // ================================================
  describe('Start on DELETE with businessKey length validation', () => {
    it('should reject with 400 on DELETE when businessKey exceeds 255 characters', async () => {
      const exceedingValue = 'a'.repeat(BUSINESS_KEY_MAX_LENGTH + 1);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440004',
        longValue: exceedingValue,
        name: 'Test',
      };

      // First create the entity
      const createResponse = await POST(
        '/odata/v4/annotation/StartOnDeleteExceedingBusinessKey',
        entity,
      );
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Delete should fail due to businessKey length
      try {
        await DELETE(`/odata/v4/annotation/StartOnDeleteExceedingBusinessKey('${entity.ID}')`);
        fail('Expected request to be rejected');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain(
          `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters`,
        );
      }

      expect(foundMessages.length).toBe(0);
    });

    it('should start process on DELETE when businessKey is within the limit', async () => {
      const validValue = 'd'.repeat(BUSINESS_KEY_MAX_LENGTH);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440009',
        longValue: validValue,
        name: 'Test',
      };

      // First create the entity
      const createResponse = await POST(
        '/odata/v4/annotation/StartOnDeleteExceedingBusinessKey',
        entity,
      );
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Delete should succeed since businessKey is within limit
      const deleteResponse = await DELETE(
        `/odata/v4/annotation/StartOnDeleteExceedingBusinessKey('${entity.ID}')`,
      );

      expect(deleteResponse.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnDeleteExceedingBusinessKeyProcess');
    });
  });

  // ================================================
  // START ON UPDATE - businessKey length validation
  // ================================================
  describe('Start on UPDATE with businessKey length validation', () => {
    it('should reject with 400 on UPDATE when businessKey exceeds 255 characters', async () => {
      const exceedingValue = 'a'.repeat(BUSINESS_KEY_MAX_LENGTH + 1);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440005',
        longValue: exceedingValue,
        name: 'Test',
      };

      // First create the entity
      const createResponse = await POST(
        '/odata/v4/annotation/StartOnUpdateExceedingBusinessKey',
        entity,
      );
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Update should fail due to businessKey length
      try {
        await PATCH(`/odata/v4/annotation/StartOnUpdateExceedingBusinessKey('${entity.ID}')`, {
          name: 'Updated',
        });
        fail('Expected request to be rejected');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.message).toContain(
          `Business key value exceeds maximum length of ${BUSINESS_KEY_MAX_LENGTH} characters`,
        );
      }

      expect(foundMessages.length).toBe(0);
    });

    it('should start process on UPDATE when businessKey is within the limit', async () => {
      const validValue = 'b'.repeat(BUSINESS_KEY_MAX_LENGTH);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440006',
        longValue: validValue,
        name: 'Test',
      };

      // First create the entity
      const createResponse = await POST(
        '/odata/v4/annotation/StartOnUpdateExceedingBusinessKey',
        entity,
      );
      expect(createResponse.status).toBe(201);
      foundMessages = [];

      // Update should succeed since businessKey is within limit
      const updateResponse = await PATCH(
        `/odata/v4/annotation/StartOnUpdateExceedingBusinessKey('${entity.ID}')`,
        { name: 'Updated' },
      );

      expect(updateResponse.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startOnUpdateExceedingBusinessKeyProcess');
    });
  });

  // ================================================
  // BOUNDARY VALUE TESTS
  // ================================================
  describe('Boundary value tests for businessKey length', () => {
    it('should start process when businessKey is exactly 254 characters (one below limit)', async () => {
      const value = 'c'.repeat(BUSINESS_KEY_MAX_LENGTH - 1);

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440007',
        longValue: value,
        name: 'Test',
      };

      const response = await POST('/odata/v4/annotation/StartWithExactLimitBusinessKey', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startExactLimitBusinessKeyProcess');
    });

    it('should start process when businessKey is exactly 1 character', async () => {
      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440008',
        longValue: 'x',
        name: 'Test',
      };

      const response = await POST('/odata/v4/annotation/StartWithExactLimitBusinessKey', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBe('startExactLimitBusinessKeyProcess');
    });
  });
});

describe('BusinessKey alias collision test', () => {
  it('should not override an entity field named "businessKey" with the businessKey alias column', async () => {
    const entity = {
      ID: '550e8400-e29b-41d4-a716-446655440099',
      businessKey: 'my-custom-business-key-value',
      name: 'Test Entity',
    };

    const response = await POST('/odata/v4/annotation/BusinessKeyCollisionTest', entity);

    expect(response.status).toBe(201);
    expect(foundMessages.length).toBe(1);

    const msg = foundMessages[0];
    expect(msg.data.definitionId).toBe('businessKeyCollisionProcess');

    // The entity's own "businessKey" field should retain its original value
    // in the context, NOT be overridden by the businessKey alias of a process.
    // This works because the businessKey is now fetched in a separate query.
    expect(msg.data.context.businessKey).toBe('my-custom-business-key-value');
  });
});

describe('Integration tests for Composite Business Key', () => {
  // Helper function to create a test car entity
  const createTestCar = (id?: string, mileage: number = 100) => ({
    ID: id || cds.utils.uuid(),
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
