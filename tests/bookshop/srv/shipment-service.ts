import cds from '@sap/cds';
import ShipmentHandlerService from '#cds-models/eu12/bpm-horizon-walkme/sdshipmentprocessor/ShipmentHandlerService';
class ShipmentService extends cds.ApplicationService {
  async init() {
    // Example: Start a process
    this.on('startShipment', async (req: cds.Request) => {
      const shipmentProcess = await cds.connect.to(ShipmentHandlerService);

      const { shipmentID } = req.data;
      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });

      const processInstance = await shipmentProcess.start({
        referenceid: shipmentID,
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
      const { shipmentID, newStatus } = req.data;

      if (newStatus === 'SUSPENDED') {
        await shipmentProcess.suspend({
          businessKey: shipmentID,
          cascade: false,
        });
      } else if (newStatus === 'RESUMED') {
        await shipmentProcess.resume({
          businessKey: shipmentID,
          cascade: false,
        });
      } else {
        throw cds.error(400, `Unsupported status: ${newStatus}`);
      }

      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });
      return shipment;
    });

    // Example: Cancel a process
    this.on('cancelShipment', async (req: cds.Request) => {
      const shipmentProcess = await cds.connect.to(ShipmentHandlerService);

      const { shipmentID } = req.data;

      await shipmentProcess.cancel({
        businessKey: shipmentID,
        cascade: false,
      });

      const shipment = await SELECT.one.from('Shipments').where({ ID: shipmentID });
      return shipment;
    });

    // Example: Get all attributes for a shipment's workflow instances
    this.on('getShipmentAttributes', async (req: cds.Request) => {
      const { shipmentID } = req.data;

      // Use generic ProcessService for all workflow queries
      const processService = await cds.connect.to(ShipmentHandlerService);

      // Get all workflow instances by business key
      const instances = await processService.getInstancesByBusinessKey({
        businessKey: shipmentID,
      });

      const allAttributes = [];

      // Get attributes for each workflow instance
      for (const instance of instances) {
        if (instance.id) {
          const attributes = await processService.getAttributes(instance.id);
          allAttributes.push({
            workflowId: instance.id,
            attributes: attributes,
          });
        }
      }

      return JSON.stringify(allAttributes, null, 2);
    });

    // Example: Get outputs for a shipment's workflow instances
    this.on('getShipmentOutputs', async (req: cds.Request) => {
      const { shipmentID } = req.data;

      // Use generic ProcessService for all workflow queries
      const processService = await cds.connect.to(ShipmentHandlerService);

      // Get all workflow instances by business key
      const instances = await processService.getInstancesByBusinessKey({
        businessKey: shipmentID,
      });

      const allOutputs = [];

      // Get outputs for each workflow instance
      for (const instance of instances) {
        if (instance.id && instance.status == 'COMPLETED') {
          const outputs = await processService.getOutputs(instance.id);
          allOutputs.push({
            workflowId: instance.id,
            outputs: outputs,
          });
        }
      }

      return JSON.stringify(allOutputs, null, 2);
    });

    await super.init();
  }
}

export default ShipmentService;
