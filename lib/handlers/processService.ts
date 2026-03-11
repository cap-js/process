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

    if (!req.data) {
      return req.reject({ status: 400, message: 'Malformed request: missing request data' });
    }

    const inputs = req.data.inputs ?? {};
    const payload: ProcessStartPayload = { definitionId, context: inputs };

    await emitProcessEvent('start', req, payload, `Failed to start workflow: ${definitionId}`);
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

    await emitProcessEvent(
      'suspend',
      req,
      payload,
      `Failed to suspend process with business key: ${businessKey}`,
    );

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

    await emitProcessEvent(
      'resume',
      req,
      payload,
      `Failed to resume process with business key: ${businessKey}`,
    );

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
    await emitProcessEvent(
      'cancel',
      req,
      payload,
      `Failed to cancel process with business key: ${businessKey}`,
    );

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
    if (!businessKey) {
      return req.reject({ status: 400, message: 'Missing required parameter: businessKey' });
    }
    if (status) {
      const validStatuses = Object.values(WorkflowStatus);
      const statuses = Array.isArray(status) ? status : [status];
      const invalidStatuses = statuses.filter((s) => !validStatuses.includes(s));
      if (invalidStatuses.length > 0) {
        return req.reject({
          status: 400,
          message: `Invalid status value(s): ${invalidStatuses.join(', ')}. Valid values are: ${validStatuses.join(', ')}`,
        });
      }
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);
    const result = await processService.send('getInstancesByBusinessKey', {
      businessKey,
      status,
    });

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
