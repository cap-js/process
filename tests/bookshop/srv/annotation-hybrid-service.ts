import cds from '@sap/cds';
import Annotation_Lifecycle_ProcessService from '#cds-models/eu12/cdsmunich/capprocesspluginhybridtest/Annotation_Lifecycle_ProcessService';

class AnnotationHybridService extends cds.ApplicationService {
  async init() {
    const annotationLifecycleProcess = await cds.connect.to(Annotation_Lifecycle_ProcessService);

    this.on('getInstances', async (req: cds.Request) => {
      const { ID, status } = req.data;
      const instances = await annotationLifecycleProcess.getInstances({
        businessKey: ID,
        status: status,
      });
      return instances;
    });

    await super.init();
  }
}

export default AnnotationHybridService;
