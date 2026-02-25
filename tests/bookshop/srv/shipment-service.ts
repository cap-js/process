import cds from '@sap/cds';
import ShipmentHandlerService from '#cds-models/eu12/bpm-horizon-walkme/sdshipmentprocessor/ShipmentHandlerService';
class ShipmentService extends cds.ApplicationService {
  async init() {
    // Example: Start a process
    this.on('startShipment', async (req: cds.Request) => {
      const shipmentProcess = await cds.connect.to(ShipmentHandlerService);
      const queued_shipmentProcess = cds.queued(shipmentProcess) as typeof shipmentProcess;

      const { shipmentID } = req.data;
      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });

      // Start the process with typed inputs
      const processInstance = await queued_shipmentProcess.start({
        businesskey: shipmentID,
        startingShipment: {
          identifier: shipment.ID,
          items: [
            {
              identifier: 'item_1',
              title: 'Laptop',
              quantity: 1,
              price: 1200.0,
            },
          ],
        },
      });

      return processInstance;
    });

    // Example: Update shipment status (suspend/resume based on newStatus)
    this.on('updateShipmentStatus', async (req: cds.Request) => {
      const shipmentProcess = await cds.connect.to(ShipmentHandlerService);
      const queued_shipmentProcess = cds.queued(shipmentProcess) as typeof shipmentProcess;

      const { shipmentID, newStatus } = req.data;

      if (newStatus === 'SUSPENDED') {
        await queued_shipmentProcess.suspend({
          businessKey: shipmentID,
          cascade: false,
        });
      } else if (newStatus === 'RESUMED') {
        await queued_shipmentProcess.resume({
          businessKey: shipmentID,
          cascade: false,
        });
      }

      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });
      return shipment;
    });

    // Example: Cancel a process
    this.on('cancelShipment', async (req: cds.Request) => {
      const shipmentProcess = await cds.connect.to(ShipmentHandlerService);
      const queued_shipmentProcess = cds.queued(shipmentProcess) as typeof shipmentProcess;

      const { shipmentID } = req.data;

      await queued_shipmentProcess.cancel({
        businessKey: shipmentID,
        cascade: false,
      });

      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });
      return shipment;
    });

    await super.init();
  }
}

export default ShipmentService;
