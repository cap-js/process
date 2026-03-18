import cds from '@sap/cds';
import Programatically_Lifecycle_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programatically_Lifecycle_ProcessService';
import Programatically_Output_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programatically_Output_ProcessService';
const lifecycleProcessService = Programatically_Lifecycle_ProcessService;

class ProgrammaticService extends cds.ApplicationService {
  async init() {
    this.on('startLifeCycleProcess', async (req: cds.Request) => {
      const programmaticLifecycleProcess = await cds.connect.to(lifecycleProcessService);
      const { ID } = req.data;
      await programmaticLifecycleProcess.start({ ID });
    });

    this.on('updateProcess', async (req: cds.Request) => {
      const { ID, newStatus } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(lifecycleProcessService);
      if (newStatus === 'SUSPEND') {
        await programmaticLifecycleProcess.suspend({
          businessKey: ID,
        });
      } else if (newStatus === 'RESUME') {
        await programmaticLifecycleProcess.resume({
          businessKey: ID,
        });
      }
    });

    this.on('cancelProcess', async (req: cds.Request) => {
      const { ID } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(lifecycleProcessService);
      await programmaticLifecycleProcess.cancel({ businessKey: ID });
    });

    this.on('getInstancesByBusinessKey', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(lifecycleProcessService);
      const instances = await programmaticLifecycleProcess.getInstancesByBusinessKey({
        businessKey: ID,
        status: status,
      });
      return instances;
    });

    this.on('getAttributes', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(lifecycleProcessService);
      const processInstances = await programmaticLifecycleProcess.getInstancesByBusinessKey({
        businessKey: ID,
        status: status,
      });
      const allAttributes = [];
      for (const instance of processInstances) {
        if (instance.id) {
          const attributes = await programmaticLifecycleProcess.getAttributes(instance.id);
          allAttributes.push({
            workflowId: instance.id,
            attributes: attributes,
          });
        }
      }
      return allAttributes;
    });

    this.on('startForGetOutputs', async (req: cds.Request) => {
      const { ID, mandetory_date, mandetory_string, optional_date, optional_string } = req.data;
      const programmaticOutputProcess = await cds.connect.to(Programatically_Output_ProcessService);
      await programmaticOutputProcess.start({
        ID,
        mandetory_date,
        mandetory_string,
        optional_date,
        optional_string,
      });
    });

    this.on('getInstanceIDForGetOutputs', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const programmaticOutputProcess = await cds.connect.to(Programatically_Output_ProcessService);
      const processInstances = await programmaticOutputProcess.getInstancesByBusinessKey({
        businessKey: ID,
        status: status,
      });
      const allAttributes = [];
      for (const instance of processInstances) {
        if (instance.id) {
          const attributes = await programmaticOutputProcess.getAttributes(instance.id);
          allAttributes.push({
            workflowId: instance.id,
            attributes: attributes,
          });
        }
      }
      return allAttributes;
    });

    this.on('getOutputs', async (req: cds.Request) => {
      const { instanceId } = req.data;
      const programmaticOutputProcess = await cds.connect.to(Programatically_Output_ProcessService);
      const outputs = await programmaticOutputProcess.getOutputs(instanceId);
      return outputs;
    });

    await super.init();
  }
}

export default ProgrammaticService;
