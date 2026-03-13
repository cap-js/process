import cds from '@sap/cds';

class ProgramaticalService extends cds.ApplicationService {
  async init() {
    this.on('startProcess', async (req: cds.Request) => {
      const { ID } = req.data;
    });
    this.on('updateProcess', async (req: cds.Request) => {});
    this.on('suspendProcess', async (req: cds.Request) => {});
    this.on('getInstancesByShipmentID', async (req: cds.Request) => {});
    this.on('getAttributes', async (req: cds.Request) => {});
    this.on('getOutputs', async (req: cds.Request) => {});
  }
}
