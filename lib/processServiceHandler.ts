import cds from '@sap/cds';
import { PROCESS_PREFIX } from './constants';

const LOG = cds.log('process');

export function registerProcessServiceHandlers(service: cds.Service): void {
  const definitionId = service.definition?.[PROCESS_PREFIX] as string | undefined;

  if (!definitionId) {
    LOG.warn(`No definitionID found for service ${service.name}. Process service handlers will not be registered.`);
    return;
  }

  LOG.info(`Registering handlers for process service: ${service.name}`);
  LOG.info(`  ${PROCESS_PREFIX}: ${definitionId}`);

  registerStartHandler(service, definitionId);
  registerSuspendHandler(service, definitionId);
  registerResumeHandler(service, definitionId);
  registerCancelHandler(service, definitionId);
}

function registerStartHandler(service: cds.Service, definitionId: string): void {
  service.on('start', async (req) => {
    LOG.debug(`Starting process: ${definitionId}`);

    const { inputs } = req.data;
    if (!inputs) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_INPUTS' });
    }
    const processService = await cds.connect.to('ProcessService');

    // revisit - check outbox
    const result = await processService.emit('start', {
      definitionId,
      context: inputs
    });

    LOG.debug(`Process started: ${JSON.stringify(result)}`);
    return {
      id: result.id,
      definitionId: definitionId,
      definitionVersion: result.definitionVersion
    };
  });
}

function registerSuspendHandler(service: cds.Service, definitionId: string): void {
  service.on('suspend', async (req) => {
    LOG.debug(`Suspending process: ${definitionId}`);

    const { businessKey, cascade } = req.data;
    if (!businessKey) {
      return req.reject({ status: 400, message: 'MISSING_REQUIRED_PARAM_BUSINESS_KEY' });
    }

    const processService = await cds.connect.to('ProcessService');

    // revisit - check outbox
    await processService.emit('suspend', {
      businessKey,
      cascade: cascade ?? false
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

    const processService = await cds.connect.to('ProcessService');

    // revisit - check outbox
    await processService.emit('resume', {
      businessKey,
      cascade: cascade ?? false
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

    const processService = await cds.connect.to('ProcessService');

    // revisit - check outbox
    await processService.emit('cancel', {
      businessKey,
      cascade: cascade ?? false
    });

    LOG.debug(`Process cancelled: businessKey=${businessKey}`);
  });
}
