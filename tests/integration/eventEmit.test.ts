/* eslint-disable @typescript-eslint/no-explicit-any */
import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { test, POST } = cds.test(app);

describe('ProcessService Event Emit Integration Tests', () => {
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

  describe('Process Start Event', () => {
    it('should start a shipment', async () => {
      const createResponse = await POST('/odata/v4/shipment/Shipments', {
        status: 'PENDING',
      });

      const shipmentID = createResponse.data.ID;

      const response = await POST('/odata/v4/shipment/startShipment', {
        shipmentID: shipmentID,
      });

      expect(response.status).toBe(204);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('start');
      expect(foundMessages[0].data.context).toBeDefined();
      expect(foundMessages[0].data.context.businesskey).toBeDefined();
      expect(foundMessages[0].data.context.businesskey).toEqual(shipmentID);
    });
  });

  describe('Process Cancel Event', () => {
    it('should call cancelShipment action', async () => {
      const createResponse = await POST('/odata/v4/shipment/Shipments', {
        status: 'PENDING',
      });

      const shipmentID = createResponse.data.ID;

      const response = await POST('/odata/v4/shipment/cancelShipment', {
        shipmentID: shipmentID,
      });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('cancel');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });
  });

  describe('Process Suspend Event', () => {
    it('should update shipment status to suspended', async () => {
      const createResponse = await POST('/odata/v4/shipment/Shipments', {
        status: 'PENDING',
      });

      const shipmentID = createResponse.data.ID;

      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID: shipmentID,
        newStatus: 'SUSPENDED',
      });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('suspend');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });
  });

  describe('Process Resume Event', () => {
    it('should update shipment status to resumed', async () => {
      const createResponse = await POST('/odata/v4/shipment/Shipments', {
        status: 'SUSPENDED',
      });

      const shipmentID = createResponse.data.ID;

      const response = await POST('/odata/v4/shipment/updateShipmentStatus', {
        shipmentID: shipmentID,
        newStatus: 'RESUMED',
      });

      expect(response.status).toBe(200);
      expect(foundMessages.length).toBe(1);
      expect(foundMessages[0].event).toBe('resume');
      expect(foundMessages[0].data.businessKey).toBeDefined();
      expect(foundMessages[0].data.businessKey).toEqual(shipmentID);
    });
  });
});
