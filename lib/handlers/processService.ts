import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX, PROCESS_PREFIX, PROCESS_SERVICE } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export function registerProcessServiceHandlers(service: cds.Service): void {
  const definitionId = service.definition?.[PROCESS_PREFIX] as string | undefined;

  if (!definitionId) {
    LOG.warn(
      `No definitionID found for service ${service.name}. Process service handlers will not be registered.`,
    );
    return;
  }

  LOG.info(`Registering handlers for process service: ${service.name}`);
  LOG.info(`  ${PROCESS_PREFIX}: ${definitionId}`);

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
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INPUTS' });
    }
    const processService = await cds.connect.to(PROCESS_SERVICE);

    // revisit - check outbox
    await processService.emit('start', {
      definitionId,
      context: inputs,
    });
  });
}

function registerSuspendHandler(service: cds.Service, definitionId: string): void {
  service.on('suspend', async (req) => {
    LOG.debug(`Suspending process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    // revisit - check outbox
    await processService.emit('suspend', {
      businessKey,
      cascade: cascade ?? false,
    });

    LOG.debug(`Process suspended: businessKey=${businessKey}`);
  });
}

function registerResumeHandler(service: cds.Service, definitionId: string): void {
  service.on('resume', async (req) => {
    LOG.debug(`Resuming process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    // revisit - check outbox
    await processService.emit('resume', {
      businessKey,
      cascade: cascade ?? false,
    });

    LOG.debug(`Process resumed: businessKey=${businessKey}`);
  });
}

function registerCancelHandler(service: cds.Service, definitionId: string): void {
  service.on('cancel', async (req) => {
    LOG.debug(`Cancelling process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    // revisit - check outbox
    await processService.emit('cancel', {
      businessKey,
      cascade: cascade ?? false,
    });

    LOG.debug(`Process cancelled: businessKey=${businessKey}`);
  });
}

function registerGetInstancesByBusinessKeyHandler(
  service: cds.Service,
  definitionId: string,
): void {
  service.on('getInstancesByBusinessKey', async (req) => {
    LOG.debug(`Getting instances by businessKey for process: ${definitionId}`);

    const { businessKey } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    // revisit - check outbox
    const result = await processService.send('getInstancesByBusinessKey', {
      businessKey,
    });

    return result;
  });
}

function registerGetAttributesHandler(service: cds.Service, definitionId: string): void {
  service.on('getAttributes', async (req) => {
    LOG.debug(`Getting attributes for process: ${definitionId}`);

    const { processInstanceId } = req.data;
    if (!processInstanceId) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    const result = await processService.send('getAttributes', {
      processInstanceId,
    });

    return result;
  });
}

function registerGetOutputsHandler(service: cds.Service, definitionId: string): void {
  service.on('getOutputs', async (req) => {
    LOG.debug(`Getting outputs for process: ${definitionId}`);

    const { processInstanceId } = req.data;
    if (!processInstanceId) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INSTANCE_ID' });
    }

    const processService = await cds.connect.to(PROCESS_SERVICE);

    const result = await processService.send('getOutputs', {
      processInstanceId,
    });

    return result;
  });
}
