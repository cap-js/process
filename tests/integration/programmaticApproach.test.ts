/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { test, POST } = cds.test(app);

describe('Programatic Approach Integration Tests', () => {
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

  async function createShipment(status = 'PENDING'): Promise<string> {
    const res = await POST('/odata/v4/shipment/Shipments', { status });
    return res.data.ID;
  }

  async function startShipment(shipmentID: string) {
    return POST('/odata/v4/shipment/startShipment', { shipmentID });
  }

  describe('Process Start Event', () => {
    it('should start a shipment and emit a start event', async () => {
      const shipmentID = await createShipment();
      const response = await startShipment(shipmentID);

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context.businesskey).toBeDefined();
      expect(foundMessages[0].data.context.businesskey).toEqual(shipmentID);
    });

    it('should include definitionId in the start event payload', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].data.definitionId).toBeDefined();
    });

    it('should include the shipment ID in the start context via startingShipment', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const context = foundMessages[0].data.context;
      expect(context.startingShipment).toBeDefined();
      expect(context.startingShipment.identifier).toEqual(shipmentID);
    });

    it('should start multiple independent shipments as separate events', async () => {
      const idA = await createShipment();
      const idB = await createShipment();

      await startShipment(idA);
      await startShipment(idB);

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].data.context.businesskey).toEqual(idA);
      expect(foundMessages[1].data.context.businesskey).toEqual(idB);
    });
  });

  describe('Process Cancel Event', () => {
    it('should call cancelShipment and emit a cancel event', async () => {
      const shipmentID = await createShipment();
      const response = await POST('/odata/v4/shipment/cancelShipment', { shipmentID });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });

    it('should return the shipment record after cancel', async () => {
      const shipmentID = await createShipment();
      const response = await POST('/odata/v4/shipment/cancelShipment', { shipmentID });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.ID).toEqual(shipmentID);
    });
  });

  describe('Process Suspend Event', () => {
    it('should emit a suspend event when status is SUSPENDED', async () => {
      const shipmentID = await createShipment();
      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'SUSPENDED',
      });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });

    it('should return the shipment record after suspend', async () => {
      const shipmentID = await createShipment();
      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'SUSPENDED',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.ID).toEqual(shipmentID);
    });
  });

  describe('Process Resume Event', () => {
    it('should emit a resume event when status is RESUMED', async () => {
      const shipmentID = await createShipment('SUSPENDED');
      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'RESUMED',
      });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });

    it('should return the shipment record after resume', async () => {
      const shipmentID = await createShipment('SUSPENDED');
      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'RESUMED',
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.ID).toEqual(shipmentID);
    });
  });

  describe('Sequential lifecycle operations', () => {
    it('should emit start, suspend, and resume events in order', async () => {
      const shipmentID = await createShipment();

      await startShipment(shipmentID);
      await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'SUSPENDED',
      });
      await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID,
        newStatus: 'RESUMED',
      });

      expect(foundMessages.length).toBe(3);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('suspend');
      expect(foundMessages[2].event).toBe('resume');
    });

    it('should emit start then cancel events in order', async () => {
      const shipmentID = await createShipment();

      await startShipment(shipmentID);
      await POST('/odata/v4/shipment/cancelShipment', { shipmentID });

      expect(foundMessages.length).toBe(2);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[1].event).toBe('cancel');
      expect(foundMessages[0].data.context.businesskey).toEqual(shipmentID);
      expect(foundMessages[1].data.businessKey).toEqual(shipmentID);
    });
  });

  describe('Get Shipment Attributes', () => {
    it('should return attributes for a started shipment workflow', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getShipmentAttributes', { shipmentID });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should return a JSON array with attribute entries for a started workflow', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getShipmentAttributes', { shipmentID });

      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('workflowId');
      expect(parsed[0]).toHaveProperty('attributes');
    });

    it('should return an empty array when no workflow has been started', async () => {
      const shipmentID = await createShipment();

      const response = await POST('/odata/v4/shipment/getShipmentAttributes', { shipmentID });

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  describe('Get Instances by Shipment ID', () => {
    it('should return instances with expected properties', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getInstancesByShipmentID', { shipmentID });

      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('id');
      expect(parsed[0]).toHaveProperty('status');
      expect(parsed[0]).toHaveProperty('definitionId');
    });

    it('should return an empty array when no workflow has been started', async () => {
      const shipmentID = await createShipment();

      const response = await POST('/odata/v4/shipment/getInstancesByShipmentID', { shipmentID });

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });

    it('should filter instances by status', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getInstancesByShipmentID', {
        shipmentID,
        status: ['COMPLETED'],
      });

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      // All returned instances should have the requested status
      for (const instance of parsed) {
        expect(instance.status).toBe('COMPLETED');
      }
    });

    it('should return no instances for a non-matching status filter', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getInstancesByShipmentID', {
        shipmentID,
        status: ['CANCELED'],
      });

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });

  describe('Get Shipment Outputs', () => {
    it('should return outputs for a started (COMPLETED) shipment workflow', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getShipmentOutputs', { shipmentID });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should return a JSON array with output entries for COMPLETED workflow instances', async () => {
      const shipmentID = await createShipment();
      await startShipment(shipmentID);

      const response = await POST('/odata/v4/shipment/getShipmentOutputs', { shipmentID });

      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty('workflowId');
      expect(parsed[0]).toHaveProperty('outputs');
    });

    it('should return an empty array when no workflow has been started', async () => {
      const shipmentID = await createShipment();

      const response = await POST('/odata/v4/shipment/getShipmentOutputs', { shipmentID });

      expect(response.status).toBe(200);
      const parsed = JSON.parse(response.data.value);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });
  });
});
