import cds from '@sap/cds';
import Programmatic_Lifecycle_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programmatic_Lifecycle_ProcessService';
import Programmatic_Outputs_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Programmatic_Output_ProcessService';

class ProgrammaticService extends cds.ApplicationService {
  async init() {
    const programmaticLifecycleProcess = await cds.connect.to(
      Programmatic_Lifecycle_ProcessService,
    );
    const programmaticOutputProcess = await cds.connect.to(Programmatic_Outputs_ProcessService);
    const processService = await cds.connect.to('ProcessService');

    this.on('startLifeCycleProcess', async (req: cds.Request) => {
      const { ID } = req.data;
      await programmaticLifecycleProcess.start({ ID });
    });

    this.on('updateProcess', async (req: cds.Request) => {
      const { ID, newStatus } = req.data;
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
      await programmaticLifecycleProcess.cancel({ businessKey: ID });
    });

    this.on('getInstances', async (req: cds.Request) => {
      const { ID, status, top, skip } = req.data;
      const instances = await programmaticLifecycleProcess.getInstances({
        businessKey: ID,
        status: status,
        top: top,
        skip: skip,
      });
      return instances;
    });

    this.on('getAttributes', async (req: cds.Request) => {
      const { ID } = req.data;
      const processInstances = await programmaticLifecycleProcess.getInstances({
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
      const processInstances = await programmaticOutputProcess.getInstances({
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
      const outputs = await programmaticOutputProcess.getOutputs(instanceId);
      return outputs;
    });

    // Generic ProcessService handlers (using cds.connect.to('ProcessService'))
    this.on('genericStart', async (req: cds.Request) => {
      const { definitionId, businessKey, context } = req.data;
      const queuedProcessService = cds.queued(processService);
      const parsedContext = context ? JSON.parse(context) : {};
      await queuedProcessService.emit(
        'start',
        { definitionId, context: parsedContext },
        { businessKey },
      );
    });

    this.on('genericCancel', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;
      const queuedProcessService = cds.queued(processService);
      await queuedProcessService.emit('cancel', { businessKey, cascade: cascade ?? false });
    });

    this.on('genericSuspend', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;
      const queuedProcessService = cds.queued(processService);
      await queuedProcessService.emit('suspend', { businessKey, cascade: cascade ?? false });
    });

    this.on('genericResume', async (req: cds.Request) => {
      const { businessKey, cascade } = req.data;
      const queuedProcessService = cds.queued(processService);
      await queuedProcessService.emit('resume', { businessKey, cascade: cascade ?? false });
    });

    this.on('genericGetInstances', async (req: cds.Request) => {
      const result = await processService.send('getInstances', req.data);
      return result;
    });

    this.on('genericGetAttributes', async (req: cds.Request) => {
      const { processInstanceId } = req.data;
      const result = await processService.send('getAttributes', { processInstanceId });
      return result;
    });

    this.on('genericGetOutputs', async (req: cds.Request) => {
      const { processInstanceId } = req.data;
      const result = await processService.send('getOutputs', { processInstanceId });
      return result;
    });

    await super.init();
  }
}

export default ProgrammaticService;
