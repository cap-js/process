import cds from '@sap/cds';
import Programmatic_Lifecycle_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programmatic_Lifecycle_ProcessService';
import Programmatic_Outputs_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programmatic_Output_ProcessService';

class ProgrammaticService extends cds.ApplicationService {
  async init() {
    this.on('startLifeCycleProcess', async (req: cds.Request) => {
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
      const { ID } = req.data;
      await programmaticLifecycleProcess.start({ ID });
    });

    this.on('updateProcess', async (req: cds.Request) => {
      const { ID, newStatus } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
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
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
      await programmaticLifecycleProcess.cancel({ businessKey: ID });
    });

    this.on('getInstancesByBusinessKey', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
      const instances = await programmaticLifecycleProcess.getInstancesByBusinessKey({
        businessKey: ID,
        status: status,
      });
      return instances;
    });

    this.on('getAllInstancesByBusinessKey', async (req: cds.Request) => {
      const { ID } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
      const instances = await programmaticLifecycleProcess.getInstancesByBusinessKey({
        businessKey: ID,
      });
      return instances;
    });

    this.on('getAttributes', async (req: cds.Request) => {
      const { ID } = req.data;
      const programmaticLifecycleProcess = await cds.connect.to(
        Programmatic_Lifecycle_ProcessService,
      );
      const processInstances = await programmaticLifecycleProcess.getInstancesByBusinessKey({
        businessKey: ID,
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
      const { ID, mandatory_datetime, mandatory_string, optional_datetime, optional_string } =
        req.data;
      const programmaticOutputProcess = await cds.connect.to(Programmatic_Outputs_ProcessService);
      await programmaticOutputProcess.start({
        ID,
        mandatory_datetime,
        mandatory_string,
        optional_datetime,
        optional_string,
      });
    });

    this.on('getInstanceIDForGetOutputs', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const programmaticOutputProcess = await cds.connect.to(Programmatic_Outputs_ProcessService);
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
      const programmaticOutputProcess = await cds.connect.to(Programmatic_Outputs_ProcessService);
      const outputs = await programmaticOutputProcess.getOutputs(instanceId);
      return outputs;
    });

    await super.init();
  }
}

export default ProgrammaticService;
