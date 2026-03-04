import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX, PROCESS_PREFIX, PROCESS_SERVICE } from '../constants';
import { emitProcessEvent, ProcessLifecyclePayload, ProcessStartPayload } from './utils';
import { WorkflowStatus } from '../api';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export function registerProcessServiceHandlers(service: cds.Service): void {
  const definitionId = service.definition?.[PROCESS_PREFIX] as string | undefined;

  if (!definitionId) {
    LOG.warn(
      `No definitionID found for service ${service.name}. Process service handlers will not be registered.`,
    );
    return;
  }

  LOG.debug(`Registering handlers for process service: ${service.name}`);
  LOG.debug(`  ${PROCESS_PREFIX}: ${definitionId}`);

  registerStartHandler(service, definitionId);
  registerSuspendHandler(service, definitionId);
  registerResumeHandler(service, definitionId);
  registerCancelHandler(service, definitionId);
  registerGetInstancesByBusinessKeyHandler(service, definitionId);
  registerGetAttributesHandler(service, definitionId);
  registerGetOutputsHandler(service, definitionId);
}

function registerStartHandler(service: cds.Service, definitionId: string): void {
  service.on('start', async (req) => {
    LOG.debug(`Starting process: ${definitionId}`);

    const { inputs } = req.data;
    if (!inputs) {
      return req.reject({ status: 400, message: 'Missing required parameter: inputs' });
    }
    const payload: ProcessStartPayload = { definitionId, context: inputs };

    await emitProcessEvent('start', req, payload, 'PROCESS_START_FAILED', definitionId);
  });
}

function registerSuspendHandler(service: cds.Service, definitionId: string): void {
  service.on('suspend', async (req) => {
    LOG.debug(`Suspending process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'Missing required parameter: businessKey' });
    }

    const payload: ProcessLifecyclePayload = { businessKey, cascade: cascade ?? false };

    await emitProcessEvent('suspend', req, payload, 'PROCESS_SUSPEND_FAILED', businessKey);

    LOG.debug(`Process suspended: businessKey=${businessKey}`);
  });
}

function registerResumeHandler(service: cds.Service, definitionId: string): void {
  service.on('resume', async (req) => {
    LOG.debug(`Resuming process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'Missing required parameter: businessKey' });
    }

    const payload: ProcessLifecyclePayload = { businessKey, cascade: cascade ?? false };

    await emitProcessEvent('resume', req, payload, 'PROCESS_RESUME_FAILED', businessKey);

    LOG.debug(`Process resumed: businessKey=${businessKey}`);
  });
}

function registerCancelHandler(service: cds.Service, definitionId: string): void {
  service.on('cancel', async (req) => {
    LOG.debug(`Cancelling process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'Missing required parameter: businessKey' });
    }

    const payload: ProcessLifecyclePayload = { businessKey, cascade: cascade ?? false };
    await emitProcessEvent('cancel', req, payload, 'PROCESS_CANCEL_FAILED', businessKey);

    LOG.debug(`Process cancelled: businessKey=${businessKey}`);
  });
}

function registerGetInstancesByBusinessKeyHandler(
  service: cds.Service,
  definitionId: string,
): void {
  service.on('getInstancesByBusinessKey', async (req) => {
    LOG.debug(`Getting instances by businessKey for process: ${definitionId}`);

    const { businessKey, status } = req.data;
    let statusParam = status;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }
    if (!status) {
      statusParam = [
        WorkflowStatus.RUNNING,
        WorkflowStatus.SUSPENDED,
        WorkflowStatus.COMPLETED,
        WorkflowStatus.ERRONEOUS,
      ];
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);
    const result = await processService.send('getInstancesByBusinessKey', { businessKey, status: statusParam });

    return result;
  });
}

function registerGetAttributesHandler(service: cds.Service, definitionId: string): void {
  service.on('getAttributes', async (req) => {
    LOG.debug(`Getting attributes for process: ${definitionId}`);

    const { processInstanceId } = req.data;
    if (!processInstanceId) {
      return req.reject({ status: 400, message: 'Missing required parameter: processInstanceId' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);
    const result = await processService.send('getAttributes', { processInstanceId });

    return result;
  });
}

function registerGetOutputsHandler(service: cds.Service, definitionId: string): void {
  service.on('getOutputs', async (req) => {
    LOG.debug(`Getting outputs for process: ${definitionId}`);

    const { processInstanceId } = req.data;
    if (!processInstanceId) {
      return req.reject({ status: 400, message: 'Missing required parameter: processInstanceId' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);
    const result = await processService.send('getOutputs', { processInstanceId });

    return result;
  });
}
