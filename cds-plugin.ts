import cds, { Results, Target } from '@sap/cds';
import {
  addDeletedEntityToRequest,
  handleProcessCancel,
  handleProcessResume,
  handleProcessStart,
  handleProcessSuspend,
  ProcessValidationPlugin,
  registerProcessServiceHandlers,
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_CANCEL_ON,
  PROCESS_SUSPEND_ON,
  PROCESS_RESUME_ON,
  PROCESS_PREFIX,
} from './lib/index';
import { importProcess } from './lib/processImport';

// Register build plugin for annotation validation during cds build
cds.build?.register?.('process-validation', ProcessValidationPlugin);

// Register import handler for: cds import --from process
// @ts-expect-error: import does not exist on cds type
cds.import ??= {};
// @ts-expect-error: process does not exist on cds.import type
cds.import.from ??= {};
// @ts-expect-error: from does not exist on cds.import type
cds.import.from.process = importProcess;

cds.on('serving', async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return;

  service.before('DELETE', async (req: cds.Request) => {
    const target = req.target as Target;

    if (
      areCancelAnnotationsDefined(target, req.event) ||
      areSuspendAnnotationsDefined(target, req.event) ||
      areStartAnnotationsDefined(target, req.event) ||
      areResumeAnnotationsDefined(target, req.event)
    ) {
      await addDeletedEntityToRequest(target, req, areStartAnnotationsDefined(target, req.event));
    }
  });

  service.after('*', async (each: Results, req: cds.Request) => {
    const target = req.target as Target;
    if (!target) return;

    if (areStartAnnotationsDefined(target, req.event)) {
      await handleProcessStart(req);
    }
    if (areCancelAnnotationsDefined(target, req.event)) {
      await handleProcessCancel(req);
    }
    if (areSuspendAnnotationsDefined(target, req.event)) {
      await handleProcessSuspend(req);
    }

    if (areResumeAnnotationsDefined(target, req.event)) {
      await handleProcessResume(req);
    }
  });
});

function areCancelAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_CANCEL_ON] && target[PROCESS_CANCEL_ON] === event);
}

function areStartAnnotationsDefined(target: Target, event: string): boolean {
  return !!(
    target[PROCESS_START_ID] &&
    target[PROCESS_START_ON] &&
    target[PROCESS_START_ON] === event
  );
}

function areSuspendAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_SUSPEND_ON] && target[PROCESS_SUSPEND_ON] === event);
}

function areResumeAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_RESUME_ON] && target[PROCESS_RESUME_ON] === event);
}

cds.on('served', async (services) => {
  const processServices = Object.values(services).filter(
    (service) => service.definition?.[PROCESS_PREFIX],
  );
  for (const service of processServices) {
    registerProcessServiceHandlers(service);
  }
});
