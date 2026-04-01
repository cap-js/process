/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
const { join } = cds.utils.path;

const app = join(__dirname, '../../bookshop');
const { POST } = cds.test(app);

describe('Integration tests for START annotation with inputs array', () => {
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

  // Helper to get the start message context
  const getStartContext = () => {
    const startMsg = foundMessages.find((msg) => msg.event === 'start');
    return startMsg?.data?.context;
  };

  // ================================================
  // Test 1: No inputs array specified, but ProcessInputs type exists
  // Only entity fields matching ProcessInputs should be included
  // ================================================
  describe('Test 1: No inputs array (filtered by ProcessInputs)', () => {
    it('should include only entity fields matching ProcessInputs element names', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440000',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: '2500.00',
        notes: 'Handle with care',
      };

      const response = await POST('/odata/v4/annotation/StartNoInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Only fields matching ProcessInputs (status, origin) should be present
      expect(context).toEqual({
        status: shipment.status,
        origin: shipment.origin,
      });
    });
  });

  // ================================================
  // Test 2: With inputs array on selected fields
  // Only specified fields should be included in context
  // ================================================
  describe('Test 2: inputs array with selected fields', () => {
    it('should include only specified fields in process context', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440001',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: '2500.00',
      };

      const response = await POST('/odata/v4/annotation/StartSelectedInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Only specified fields should be present: ID, shipmentDate, origin
      expect(context).toEqual({
        ID: shipment.ID,
        shipmentDate: shipment.shipmentDate,
        origin: shipment.origin,
      });
    });
  });

  // ================================================
  // Test 3: With inputs array with custom aliases
  // Field should be renamed in context using { path: $self.field, as: 'Alias' }
  // ================================================
  describe('Test 3: inputs array with custom alias', () => {
    it('should rename fields according to alias in process context', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440002',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        origin: 'Berlin, Germany',
        destination: 'Rome, Italy',
        totalValue: '2500.00',
      };

      const response = await POST('/odata/v4/annotation/StartAliasInput', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // ID should remain as ID (no alias)
      expect(context).toEqual({
        ID: shipment.ID,
        ProcessStartDate: shipment.shipmentDate, // alias
        SourceLocation: shipment.origin, // alias
        TargetLocation: shipment.destination, // alias
        Amount: shipment.totalValue, // alias
      });
    });
  });

  // ================================================
  // Test 4: With nested Composition in inputs (all child fields)
  // Include composition items with all their fields using $self.items
  // ================================================
  describe('Test 4: Nested Composition in inputs (all child fields)', () => {
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
            price: '100.00',
            parentID: '550e8400-e29b-41d4-a716-446655440003',
          },
          {
            ID: 'item-002',
            title: 'Product B',
            quantity: 3,
            price: '50.00',
            parentID: '550e8400-e29b-41d4-a716-446655440003',
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartNestedComposition', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Specified fields in inputs array
      expect(context).toEqual({
        ID: order.ID,
        shipmentDate: order.shipmentDate,
        items: order.items, // entire composition included with all fields
      });
    });
  });

  // ================================================
  // Test 5: With nested Composition (selected child fields)
  // Include only selected fields from composition items using $self.items.field
  // ================================================
  describe('Test 5: Nested Composition with selected child fields', () => {
    it('should include only specified fields from composition items', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440004',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        items: [
          {
            ID: 'item-001',
            title: 'Product A',
            quantity: 5,
            price: '100.00',
          },
          {
            ID: 'item-002',
            title: 'Product B',
            quantity: 3,
            price: '50.00',
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartNestedSelected', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // Parent specified fields
      expect(context).toEqual({
        ID: order.ID,
        shipmentDate: order.shipmentDate,
        items: [
          // composition included but only with specified fields: ID, title, price
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
  // Child fields should be renamed in context using { path: $self.items.field, as: 'Alias' }
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
            unitPrice: '25.00',
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
  // Test 7: Deep cyclic path in inputs array
  // Demonstrates that explicit paths work with cyclic relationships
  // e.g. $self.items.shipment.items.shipment.ID
  // ================================================
  describe('Test 7: Deep cyclic path (items.shipment.items.shipment.ID)', () => {
    it('should handle deep cyclic paths without infinite loops', async () => {
      const shipment = {
        ID: '550e8400-e29b-41d4-a716-446655440006',
        status: 'PENDING',
        items: [
          {
            ID: 'item-001',
            title: 'Product A',
          },
          {
            ID: 'item-002',
            title: 'Product B',
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartCyclicPath', shipment);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      expect(context).toEqual({
        ID: shipment.ID,
        status: shipment.status,
        items: [
          {
            ID: shipment.items[0].ID,
            title: shipment.items[0].title,
            shipment: {
              ID: shipment.ID,
              status: shipment.status,
              items: [
                {
                  ID: shipment.items[0].ID,
                  title: shipment.items[0].title,
                  shipment: { ID: shipment.ID },
                },
                {
                  ID: shipment.items[1].ID,
                  title: shipment.items[1].title,
                  shipment: { ID: shipment.ID },
                },
              ],
            },
          },
          {
            ID: shipment.items[1].ID,
            title: shipment.items[1].title,
            shipment: {
              ID: shipment.ID,
              status: shipment.status,
              items: [
                {
                  ID: shipment.items[0].ID,
                  title: shipment.items[0].title,
                  shipment: { ID: shipment.ID },
                },
                {
                  ID: shipment.items[1].ID,
                  title: shipment.items[1].title,
                  shipment: { ID: shipment.ID },
                },
              ],
            },
          },
        ],
      });
    });
  });

  // ================================================
  // Test 8: $self wildcard - all scalar fields
  // Using $self alone to include all scalar fields plus composition
  // ================================================
  describe('Test 8: $self wildcard (all scalar fields + composition)', () => {
    it('should include all scalar fields and composition when using $self', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440008',
        status: 'PENDING',
        shipmentDate: '2026-01-15',
        totalValue: '2500.00',
        items: [
          {
            ID: 'item-001',
            title: 'Product A',
            quantity: 5,
          },
          {
            ID: 'item-002',
            title: 'Product B',
            quantity: 3,
          },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartSelfWildcard', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();
      expect(context).toEqual({
        ID: order.ID,
        status: order.status,
        shipmentDate: order.shipmentDate,
        totalValue: order.totalValue,
        items: [
          {
            ID: order.items[0].ID,
            title: order.items[0].title,
            quantity: order.items[0].quantity,
            parent_ID: order.ID,
          },
          {
            ID: order.items[1].ID,
            title: order.items[1].title,
            quantity: order.items[1].quantity,
            parent_ID: order.ID,
          },
        ],
      });
    });
  });

  describe('Test 9: $self wildcard with field alias override', () => {
    it('should include all scalar fields AND the aliased field (ID appears twice: as ID and as OrderId)', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440009',
        status: 'NEW',
        shipmentDate: '2026-02-20',
        totalValue: '999.99',
        items: [{ ID: 'item-a01', title: 'Widget', quantity: 10 }],
      };

      const response = await POST('/odata/v4/annotation/StartSelfWildcardAlias', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      expect(context).toEqual({
        ID: order.ID,
        OrderId: order.ID,
        status: order.status,
        shipmentDate: order.shipmentDate,
        totalValue: order.totalValue,
        items: [
          {
            ID: order.items[0].ID,
            title: order.items[0].title,
            quantity: order.items[0].quantity,
            parent_ID: order.ID,
          },
        ],
      });
    });
  });

  describe('Test 10: $self.items (composition wildcard) with child field alias', () => {
    it('should include all composition fields AND the aliased field (ID appears twice in items)', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440010',
        status: 'PROCESSING',
        shipmentDate: '2026-03-15',
        totalValue: '1500.00',
        items: [
          { ID: 'item-b01', title: 'Gadget', quantity: 7 },
          { ID: 'item-b02', title: 'Gizmo', quantity: 3 },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartCompositionWildcardAlias', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      expect(context).toEqual({
        ID: order.ID,
        status: order.status,
        items: [
          {
            ID: order.items[0].ID,
            ItemId: order.items[0].ID,
            title: order.items[0].title,
            quantity: order.items[0].quantity,
            parent_ID: order.ID,
          },
          {
            ID: order.items[1].ID,
            ItemId: order.items[1].ID,
            title: order.items[1].title,
            quantity: order.items[1].quantity,
            parent_ID: order.ID,
          },
        ],
      });
    });
  });

  // ================================================
  // Test 11: Multiple aliases on same scalar field
  // Same field (ID) should appear under two different names
  // ================================================
  describe('Test 11: Multiple aliases on same scalar field', () => {
    it('should include same scalar field under multiple aliases', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440011',
        status: 'NEW',
        shipmentDate: '2026-04-01',
        totalValue: '1234.56',
      };

      const response = await POST('/odata/v4/annotation/StartMultipleAliasScalar', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // ID should appear under both aliases: OrderId and ReferenceId
      expect(context).toEqual({
        OrderId: order.ID,
        ReferenceId: order.ID,
      });
    });
  });

  // ================================================
  // Test 12: Multiple aliases on same composition
  // Same composition (items) should appear under two different names
  // ================================================
  describe('Test 12: Multiple aliases on same composition', () => {
    it('should include same composition under multiple aliases', async () => {
      const order = {
        ID: '550e8400-e29b-41d4-a716-446655440012',
        status: 'PROCESSING',
        items: [
          { ID: 'item-c01', title: 'Alpha', quantity: 5 },
          { ID: 'item-c02', title: 'Beta', quantity: 10 },
        ],
      };

      const response = await POST('/odata/v4/annotation/StartMultipleAliasComposition', order);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // items should appear under both aliases: Orders and LineItems
      expect(context).toEqual({
        ID: order.ID,
        Orders: [
          {
            ID: order.items[0].ID,
            title: order.items[0].title,
            quantity: order.items[0].quantity,
            parent_ID: order.ID,
          },
          {
            ID: order.items[1].ID,
            title: order.items[1].title,
            quantity: order.items[1].quantity,
            parent_ID: order.ID,
          },
        ],
        LineItems: [
          {
            ID: order.items[0].ID,
            title: order.items[0].title,
            quantity: order.items[0].quantity,
            parent_ID: order.ID,
          },
          {
            ID: order.items[1].ID,
            title: order.items[1].title,
            quantity: order.items[1].quantity,
            parent_ID: order.ID,
          },
        ],
      });
    });
  });

  // ================================================
  // Test 13: $self with Composition and Association
  // $self should only include scalar fields, NOT compositions or associations
  // ================================================
  describe('Test 13: $self with Composition and Association', () => {
    it('should include only scalar fields, NOT compositions or associations', async () => {
      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440013',
        status: 'PENDING',
        author_ID: '550e8400-e29b-41d4-a716-446655440099',
      };

      const response = await POST('/odata/v4/annotation/StartSelfWithAssoc', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // $self should only include scalar fields: ID, status
      // Includes Association key
      expect(context).toEqual({
        ID: entity.ID,
        status: entity.status,
        author_ID: entity.author_ID,
      });
    });
  });

  // ================================================
  // Test 14: $self.author - explicitly include association
  // Should expand the author association with all its fields
  // ================================================
  describe('Test 14: $self.author - explicitly include association', () => {
    it('should include the author association expanded with all its fields', async () => {
      const author = {
        ID: '550e8400-e29b-41d4-a716-446655440098',
        name: 'John Doe',
      };

      const entity = {
        ID: '550e8400-e29b-41d4-a716-446655440015',
        status: 'PENDING',
        items: [{ ID: 'item-f01', title: 'Item A', quantity: 5 }],
        author_ID: author.ID,
      };

      // Create author first
      await POST('/odata/v4/annotation/StartWithAuthorInputAuthors', author);

      const response = await POST('/odata/v4/annotation/StartWithAuthorInput', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // inputs: [$self.ID, $self.status, $self.author]
      // Should include ID, status, and author expanded (NOT items, NOT author_ID)
      expect(context).toEqual({
        ID: entity.ID,
        status: entity.status,
        author_ID: author.ID,
        author: {
          ID: author.ID,
          name: author.name,
        },
      });
    });
  });

  // ================================================
  // Test 15: No inputs, ProcessInputs exists but zero entity fields match
  // Should send empty context {}
  // ================================================
  describe('Test 15: No inputs, ProcessInputs exists but zero fields match', () => {
    it('should send empty context when no entity fields match ProcessInputs', async () => {
      const entity = {
        ID: '550e8400-e29b-41d4-a716-44665544ff01',
        shipmentDate: '2026-01-15',
        expectedDelivery: '2026-01-25',
        totalValue: 2500.0,
        notes: 'Handle with care',
      };

      const response = await POST('/odata/v4/annotation/StartNoInputZeroMatch', entity);

      expect(response.status).toBe(201);
      expect(foundMessages.length).toBe(1);

      const context = getStartContext();
      expect(context).toBeDefined();

      // ProcessInputs has {status, origin} but entity has {ID, shipmentDate, expectedDelivery, totalValue, notes}
      // No field names match, so context should be empty
      expect(context).toEqual({});
    });
  });
});
