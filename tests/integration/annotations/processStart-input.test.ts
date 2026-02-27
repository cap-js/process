/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { test, POST } = cds.test(app);

describe('Integration tests for START annotation with @build.process.input', () => {
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

  // Helper to get the start message context
  const getStartContext = () => {
    const startMsg = foundMessages.find((msg) => msg.event === 'start');
    return startMsg?.data?.context;
  };

  // ================================================
  // Test 1: No @build.process.input
  // All entity fields should be included in context
  // ================================================
  describe('Test 1: No @build.process.input (all fields included)', () => {
    it('should include all entity fields in process context', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440000',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: 2500.0,
        notes: 'Handle with care',
      };

      const response = await POST('/odata/v4/annotation/StartNoInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // All fields should be present
      expect(context).toEqual({ ...shipment, businesskey: shipment.ID });
    });
  });

  // ================================================
  // Test 2: With @build.process.input on selected fields
  // Only annotated fields should be included in context
  // ================================================
  describe('Test 2: @build.process.input on selected fields', () => {
    it('should include only annotated fields in process context', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440001',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: 2500.0,
      };

      const response = await POST('/odata/v4/annotation/StartSelectedInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Only annotated fields should be present: ID, shipmentDate, origin
      expect(context).toEqual({
        ID: shipment.ID,
        shipmentDate: shipment.shipmentDate,
        origin: shipment.origin,
        businesskey: shipment.ID,
      });
    });
  });

  // ================================================
  // Test 3: With @build.process.input with custom alias
  // Field should be renamed in context
  // ================================================
  describe('Test 3: @build.process.input with custom alias', () => {
    it('should rename fields according to alias in process context', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440002',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: 2500.0,
      };

      const response = await POST('/odata/v4/annotation/StartAliasInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // ID should remain as ID (no alias)
      expect(context).toEqual({
        ID: shipment.ID,
        businesskey: shipment.ID,
        ProcessStartDate: shipment.shipmentDate, // alias
        SourceLocation: shipment.origin, // alias
        TargetLocation: shipment.destination, // alias
        Amount: shipment.totalValue, // alias
      });
    });
  });

  // ================================================
  // Test 4: With nested Composition (all child fields)
  // Include composition items with all their fields
  // ================================================
  describe('Test 4: Nested Composition with @build.process.input (all child fields)', () => {
    it('should include composition items with all their fields', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440003',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        items: [
          {
            ID: 'item-001',
            title: 'Product A',
            quantity: 5,
            price: 100.0,
            parentID: '550e8400-e29b-41d4-a716-446655440003',
          },
          {
            ID: 'item-002',
            title: 'Product B',
            quantity: 3,
            price: 50.0,
            parentID: '550e8400-e29b-41d4-a716-446655440003',
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartNestedComposition', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Annotated fields
      expect(context).toEqual({
        ID: order.ID,
        shipmentDate: order.shipmentDate,
        businesskey: order.ID,
        items: order.items, // entire composition included with all fields
      });
    });
  });

  // ================================================
  // Test 5: With nested Composition (selected child fields)
  // Include only selected fields from composition items
  // ================================================
  describe('Test 5: Nested Composition with selected child fields', () => {
    it('should include only annotated fields from composition items', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440004',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        items: [
          {
            ID: 'item-001',
            title: 'Product A',
            quantity: 5,
            price: 100.0,
          },
          {
            ID: 'item-002',
            title: 'Product B',
            quantity: 3,
            price: 50.0,
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartNestedSelected', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Parent annotated fields
      expect(context).toEqual({
        ID: order.ID,
        shipmentDate: order.shipmentDate,
        businesskey: order.ID,
        items: [
          // composition included but only with annotated fields: ID, title, price
          {
            ID: order.items[0].ID,
            title: order.items[0].title,
            price: order.items[0].price,
          },
          {
            ID: order.items[1].ID,
            title: order.items[1].title,
            price: order.items[1].price,
          },
        ],
      });
    });
  });

  // ================================================
  // Test 6: Nested Composition with aliases
  // Child fields should be renamed in context
  // ================================================
  describe('Test 6: Nested Composition with aliases', () => {
    it('should rename fields according to aliases in nested items', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440005',
        status: 'PENDING',
        orderDate: '2026-01-15',
        items: [
          {
            ID: 'item-001',
            productName: 'Widget',
            quantity: 10,
            unitPrice: 25.0,
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartNestedAlias', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Parent fields with aliases
      expect(context).toEqual({
        ID: order.ID,
        ProcessDate: order.orderDate, // alias
        businesskey: order.ID,
        OrderLines: [
          {
            ID: order.items[0].ID,
            Product: order.items[0].productName, // alias
            Qty: order.items[0].quantity, // alias
            Price: order.items[0].unitPrice, // alias
          },
        ],
      });
    });
  });
  // ================================================
  // Test 7: Cycles in associations
  // Should throw an error
  // ================================================
  describe('Test 7: Cycles in associations', () => {
    it('should throw an error when cycle is detected', async () => {
      const object = {
        ID: '550e8400-e29b-41d4-a716-446655440006',
        name: 'Test Cycle A',
        cycleBID: '550e8400-e29b-41d4-a716-446655440007',
      };
      try {
        await POST('/odata/v4/annotation/StartCycleA', object);
      } catch (error: any) {
        expect(error.status).toBe(400);
        expect(error.message).toContain('Cycle detected in @build.process.input annotations:');
      }
    });
  });
});
