import cds from '@sap/cds';
import { PROCESS_SERVICE } from '../../../lib/constants';
import { cancelShipmentHandler, resumeShipmentHandler, startShipmentHandler, suspendShipmentHandler } from '../@cds-models/ProcessService';

class ShipmentService extends cds.ApplicationService {
  async init() {

    this.on('startShipment', async (req: cds.Request) => {
      const processService = await cds.connect.to(PROCESS_SERVICE);
      const { shipmentID } = req.data;
      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });

      const eventData: startShipmentHandler = {
        businesskey: shipment.ID,
        startingShipment: {
          identifier: shipment.ID,
          items: [
            {
              identifier: "identifier",
              price: 345,
              quantity: 2,
              title: "Test Item"
            }
          ]
        }
      };
      await processService.emit(startShipmentHandler, eventData);
    });

    this.on('updateShipmentStatus', async (req: cds.Request) => {
      const processService = await cds.connect.to(PROCESS_SERVICE);
      const { newStatus, shipmentID } = req.data;
      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });

      if (newStatus === "RESUMED") {
        const eventData: resumeShipmentHandler = {
          businessKey: shipment.ID,
          cascade: false
        };
        await processService.emit(resumeShipmentHandler, eventData);
        return;
      }

      if (newStatus === "SUSPENDED") {
        const eventData: suspendShipmentHandler = {
          businessKey: shipment.ID,
          cascade: false
        };
        await processService.emit(suspendShipmentHandler, eventData);
        return;
      }
    });

    this.on('cancelShipment', async (req: cds.Request) => {
      const processService = await cds.connect.to(PROCESS_SERVICE);
      const { shipmentID } = req.data;
      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });

      await processService.emit(cancelShipmentHandler, {
        businessKey: shipment.ID,
        cascade: false
      });
      return;
    });

    await super.init();
  }
}

export default ShipmentService;
