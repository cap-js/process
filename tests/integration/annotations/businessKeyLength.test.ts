/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST, DELETE, PATCH } = cds.test(app);

const BUSINESS_KEY_MAX_LENGTH = 255;

describe('Integration tests for Business Key Length Validation on processStart', () => {
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

  // ================================================
  // START ON CREATE - businessKey length validation
  // ================================================
  describe('Start on CREATE with businessKey length validation', () => {
    it('should start process when businessKey is well under 255 characters', async () => {
      const car = {
        ID: '550e8400-e29b-41d4-a716-446655440000',
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
