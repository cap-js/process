import cds from '@sap/cds';
import * as csn from '../types/csn-extensions';
import { ProcessHeader, DataType } from '../api';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { buildTypeFromSchema, ensureObjectSchema } from './schemaMapper';
import { fqn, sanitizeName, capitalize } from './utils';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export function buildCsnModel(
  process: ProcessHeader,
  dataTypeCache: Map<string, DataType>,
): csn.CsnModel {
  const serviceName = `${process.projectId}.${capitalize(process.identifier)}Service`;
  LOG.debug(`Service name: ${serviceName}`);

  const definitions: Record<string, csn.CsnDefinition> = {};

  definitions[serviceName] = createServiceDefinition(serviceName, process);
  for (const dataType of dataTypeCache.values()) {
    addDataTypeDefinition(dataType, serviceName, definitions, dataTypeCache);
  }

  addProcessTypes(process, serviceName, definitions, dataTypeCache);

  const normalizedInputSchema = ensureObjectSchema(process.header?.inputs);
  const inputProperties = normalizedInputSchema.properties ?? {};
  const hasInputProperties = Object.keys(inputProperties).length > 0;
  const hasRequiredInputs = hasInputProperties && (normalizedInputSchema.required?.length ?? 0) > 0;
  addProcessActions(serviceName, definitions, hasInputProperties, hasRequiredInputs);

  return {
    $version: '2.0',
    definitions,
    meta: { creator: '@cap-js/process' },
  };
}

function createServiceDefinition(serviceName: string, process: ProcessHeader): csn.CsnDefinition {
  return {
    kind: 'service',
    name: serviceName,
    doc: 'DO NOT EDIT. THIS IS A GENERATED SERVICE THAT WILL BE OVERRIDDEN ON NEXT IMPORT.',
    '@protocol': 'none',
    '@bpm.process': `${process.projectId}.${process.identifier}`,
  };
}

function addDataTypeDefinition(
  dataType: DataType,
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
  dataTypeCache: Map<string, DataType>,
): void {
  const typeName = fqn(serviceName, sanitizeName(dataType.name));

  if (definitions[typeName]) return;

  if (!dataType.header || dataType.header.type !== 'object') {
    LOG.warn(`Data type ${dataType.name} has no valid schema, creating empty type`);
    definitions[typeName] = { kind: 'type', name: typeName, elements: {} };
    return;
  }

  definitions[typeName] = buildTypeFromSchema(
    typeName,
    dataType.header,
    serviceName,
    definitions,
    dataTypeCache,
  );
  LOG.debug(`Generated type: ${typeName}`);
}

function addProcessTypes(
  process: ProcessHeader,
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
  dataTypeCache: Map<string, DataType>,
): void {
  const inputsName = fqn(serviceName, 'ProcessInputs');
  const outputsName = fqn(serviceName, 'ProcessOutputs');
  const attributeName = fqn(serviceName, 'ProcessAttribute');
  const attributesName = fqn(serviceName, 'ProcessAttributes');
  const instanceName = fqn(serviceName, 'ProcessInstance');
  const instancesName = fqn(serviceName, 'ProcessInstances');

  definitions[inputsName] = buildTypeFromSchema(
    inputsName,
    ensureObjectSchema(process.header?.inputs),
    serviceName,
    definitions,
    dataTypeCache,
  );
  definitions[outputsName] = buildTypeFromSchema(
    outputsName,
    ensureObjectSchema(process.header?.outputs),
    serviceName,
    definitions,
    dataTypeCache,
  );

  definitions[attributeName] = {
    kind: 'type',
    name: attributeName,
    elements: {
      id: { type: csn.CdsBuiltinType.String, notNull: true },
      label: { type: csn.CdsBuiltinType.String, notNull: true },
      value: { type: csn.CdsBuiltinType.String },
      type: { type: csn.CdsBuiltinType.String, notNull: true },
    },
  };

  definitions[attributesName] = {
    kind: 'type',
    name: attributesName,
    items: {
      type: attributeName,
    },
  };

  definitions[instanceName] = {
    kind: 'type',
    name: instanceName,
    elements: {
      definitionId: { type: csn.CdsBuiltinType.String },
      definitionVersion: { type: csn.CdsBuiltinType.String },
      id: { type: csn.CdsBuiltinType.String },
      status: { type: csn.CdsBuiltinType.String },
      startedAt: { type: csn.CdsBuiltinType.String },
      startedBy: { type: csn.CdsBuiltinType.String },
    },
  };

  definitions[instancesName] = {
    kind: 'type',
    name: instancesName,
    items: { type: instanceName },
  };
}

function addProcessActions(
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
  hasInputProperties: boolean,
  hasRequiredInputs: boolean,
): void {
  const inputsType = fqn(serviceName, 'ProcessInputs');
  const outputsType = fqn(serviceName, 'ProcessOutputs');
  const attributesType = fqn(serviceName, 'ProcessAttributes');
  const instancesType = fqn(serviceName, 'ProcessInstances');

  // Start action — three tiers:
  //   1. No input properties:       start() with no params
  //   2. All inputs optional:       start(inputs: ProcessInputs)        — inputs param is optional
  //   3. Some/all inputs required:  start(inputs: ProcessInputs not null) — inputs param is required
  if (!hasInputProperties) {
    definitions[fqn(serviceName, 'start')] = {
      kind: 'action',
      name: fqn(serviceName, 'start'),
    };
  } else {
    definitions[fqn(serviceName, 'start')] = {
      kind: 'action',
      name: fqn(serviceName, 'start'),
      params: {
        inputs: {
          type: inputsType,
          notNull: hasRequiredInputs ? true : undefined,
        },
      },
    };
  }

  // Query functions
  definitions[fqn(serviceName, 'getAttributes')] = {
    kind: 'function',
    name: fqn(serviceName, 'getAttributes'),
    params: {
      processInstanceId: { type: csn.CdsBuiltinType.String, notNull: true },
    },
    returns: { type: attributesType },
  };

  definitions[fqn(serviceName, 'getOutputs')] = {
    kind: 'function',
    name: fqn(serviceName, 'getOutputs'),
    params: {
      processInstanceId: { type: csn.CdsBuiltinType.String, notNull: true },
    },
    returns: { type: outputsType },
  };

  definitions[fqn(serviceName, 'getInstancesByBusinessKey')] = {
    kind: 'function',
    name: fqn(serviceName, 'getInstancesByBusinessKey'),
    params: {
      businessKey: { type: csn.CdsBuiltinType.String, notNull: true },
      status: { items: { type: csn.CdsBuiltinType.String } },
    },
    returns: { type: instancesType },
  };

  // Lifecycle actions
  for (const action of ['suspend', 'resume', 'cancel']) {
    definitions[fqn(serviceName, action)] = {
      kind: 'action',
      name: fqn(serviceName, action),
      params: {
        businessKey: { type: csn.CdsBuiltinType.String, notNull: true },
        cascade: { type: csn.CdsBuiltinType.Boolean },
      },
    };
  }
}
