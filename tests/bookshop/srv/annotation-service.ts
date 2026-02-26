import cds from '@sap/cds';

class AnnotationService extends cds.ApplicationService {
  async init() {
    // Bound action handlers for custom event testing
    // These actions simply return the entity to trigger the 'after' handler

    // Start actions
    this.on('triggerStart', 'StartOnAction', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.StartOnAction')
        .where(req.params[0] as object);
      return entity;
    });

    this.on('triggerStartWhen', 'StartOnActionWhen', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.StartOnActionWhen')
        .where(req.params[0] as object);
      return entity;
    });

    // Cancel actions
    this.on('triggerCancel', 'CancelOnAction', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.CancelOnAction')
        .where(req.params[0] as object);
      return entity;
    });

    this.on('triggerCancelWhen', 'CancelOnActionWhen', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.CancelOnActionWhen')
        .where(req.params[0] as object);
      return entity;
    });

    // Suspend actions
    this.on('triggerSuspend', 'SuspendOnAction', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.SuspendOnAction')
        .where(req.params[0] as object);
      return entity;
    });

    this.on('triggerSuspendWhen', 'SuspendOnActionWhen', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.SuspendOnActionWhen')
        .where(req.params[0] as object);
      return entity;
    });

    // Resume actions
    this.on('triggerResume', 'ResumeOnAction', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.ResumeOnAction')
        .where(req.params[0] as object);
      return entity;
    });

    this.on('triggerResumeWhen', 'ResumeOnActionWhen', async (req: cds.Request) => {
      const entity = await SELECT.one
        .from('AnnotationService.ResumeOnActionWhen')
        .where(req.params[0] as object);
      return entity;
    });

    await super.init();
  }
}

export default AnnotationService;
