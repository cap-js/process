import cds from '@sap/cds';
import * as path from 'path';

const app = path.join(__dirname, '../bookshop/');
const { test, GET, POST } = cds.test(app);

describe('ProcessService Event Emit Integration Tests', () => {
  beforeEach(async () => {
    await test.data.reset();
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
    });
  });
});
