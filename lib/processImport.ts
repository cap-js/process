import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import * as csn from './types/csn-extensions';
import { getServiceCredentials, CachingTokenProvider, createXsuaaTokenProvider } from './auth';
import {
  createProcessApiClient,
  IProcessApiClient,
  ProcessHeader,
  DataType,
  JsonSchema,
} from './api';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from './constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============================================================================
//  TYPES
// ============================================================================

interface ImportOptions {
  name?: string;
  file?: string;
}

interface SchemaMapContext {
  parentTypeName: string;
  serviceName: string;
  definitions: Record<string, csn.CsnDefinition>;
}

// ============================================================================
//  MAIN ENTRY POINT
// ============================================================================

let dataTypeCache = new Map<string, DataType>();

export async function importProcess(
  jsonFile: string,
  options: ImportOptions = {},
): Promise<csn.CsnModel> {
  dataTypeCache = new Map();

  if (options.name) {
    const { filePath, processHeader } = await fetchAndSaveProcessDefinition(options.name);
    options.file = filePath;
    return buildCsnModel(processHeader);
  }
  return generateCsnModel(jsonFile);
}

// ============================================================================
//  STEP 1: FETCH PROCESS DEFINITION FROM SBPA
// ============================================================================

interface FetchResult {
  filePath: string;
  processHeader: ProcessHeader;
}

async function fetchAndSaveProcessDefinition(processName: string): Promise<FetchResult> {
  const [projectId, processId] = splitAtLastDot(processName);
  const apiClient = await createApiClient();

  LOG.debug('Retrieving process header...');
  const processHeader = await apiClient.fetchProcessHeader(projectId, processId);
  processHeader.projectId = projectId;

  if (processHeader.dependencies?.length) {
    LOG.debug(`Fetching ${processHeader.dependencies.length} dependent data types...`);
    processHeader.dataTypes = await apiClient.fetchAllDataTypes(
      projectId,
      processHeader.dependencies,
    );
    processHeader.dataTypes.forEach((dt) => dataTypeCache.set(dt.uid, dt));
  }

  const outputPath = path.join(cds.root, 'srv', 'workflows', `${processName}.json`);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, JSON.stringify(processHeader, null, 2), 'utf8');

  return { filePath: outputPath, processHeader };
}

async function createApiClient(): Promise<IProcessApiClient> {
  let credentials = getServiceCredentials(PROCESS_SERVICE);

  if (!credentials) {
    // Try to resolve cloud bindings automatically (same as cds bind --exec does)
    // REVISIT: once merged in core
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { env: bindingEnv } = require('@sap/cds-dk/lib/bind/shared');
      process.env.CDS_ENV ??= 'hybrid';
      /* eslint-disable @typescript-eslint/no-explicit-any */
      (cds as any).env = cds.env.for('cds');
      Object.assign(process.env, await bindingEnv());
      (cds as any).env = cds.env.for('cds');
      (cds as any).requires = cds.env.requires;
      /* eslint-enable @typescript-eslint/no-explicit-any */
      credentials = getServiceCredentials(PROCESS_SERVICE);
    } catch {
      // cds-dk not available or binding resolution failed
    }
  }

  if (!credentials) {
    throw new Error(
      'No ProcessService credentials found. Ensure you have bound a process service instance (e.g., via cds bind process -2 <instance>).',
    );
  }

  const apiUrl = credentials.endpoints?.api;
  if (!apiUrl) {
    throw new Error('No API URL found in ProcessService credentials.');
  }

  LOG.debug('Creating API client...');
  const tokenProvider = createXsuaaTokenProvider(credentials);
  const cachingTokenProvider = new CachingTokenProvider(tokenProvider);

  return createProcessApiClient(apiUrl, () => cachingTokenProvider.getToken());
}

// ============================================================================
//  STEP 2: GENERATE CSN MODEL
// ============================================================================

async function generateCsnModel(jsonFilePath: string): Promise<csn.CsnModel> {
  const processHeader = loadProcessHeader(jsonFilePath);
  const csnModel = buildCsnModel(processHeader);

  return csnModel;
}

function loadProcessHeader(filePath: string): ProcessHeader {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const header = JSON.parse(content) as ProcessHeader;

  header.dataTypes?.forEach((dt) => dataTypeCache.set(dt.uid, dt));
  return header;
}

function buildCsnModel(process: ProcessHeader): csn.CsnModel {
  const serviceName = `${process.projectId}.${capitalize(process.identifier)}Service`;
  LOG.debug(`Service name: ${serviceName}`);

  const definitions: Record<string, csn.CsnDefinition> = {};

  definitions[serviceName] = createServiceDefinition(serviceName, process);
  for (const dataType of dataTypeCache.values()) {
    addDataTypeDefinition(dataType, serviceName, definitions);
  }

  addProcessTypes(process, serviceName, definitions);

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

// ============================================================================
//  CSN BUILDERS: SERVICE & TYPES
// ============================================================================

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
): void {
  const typeName = fqn(serviceName, sanitizeName(dataType.name));

  if (definitions[typeName]) return;

  if (!dataType.header || dataType.header.type !== 'object') {
    LOG.warn(`Data type ${dataType.name} has no valid schema, creating empty type`);
    definitions[typeName] = { kind: 'type', name: typeName, elements: {} };
    return;
  }

  definitions[typeName] = buildTypeFromSchema(typeName, dataType.header, serviceName, definitions);
  LOG.debug(`Generated type: ${typeName}`);
}

function addProcessTypes(
  process: ProcessHeader,
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
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
  );
  definitions[outputsName] = buildTypeFromSchema(
    outputsName,
    ensureObjectSchema(process.header?.outputs),
    serviceName,
    definitions,
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

// ============================================================================
//  CSN BUILDERS: ACTIONS
// ============================================================================

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

// ============================================================================
//  JSON SCHEMA → CSN CONVERSION
// ============================================================================

function buildTypeFromSchema(
  typeName: string,
  schema: JsonSchema,
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
): csn.CsnType {
  const required = new Set(schema.required ?? []);
  const elements: Record<string, csn.CsnElement> = {};

  const properties = schema.properties ?? {};
  for (const propName in properties) {
    if (Object.hasOwn(properties, propName)) {
      const propSchema = properties[propName];
      const safeName = sanitizeName(propName);
      elements[safeName] = mapSchemaPropertyToElement(
        safeName,
        propSchema,
        required.has(propName),
        {
          parentTypeName: typeName,
          serviceName,
          definitions,
        },
      );
    }
  }

  return { kind: 'type', name: typeName, elements };
}

function mapSchemaPropertyToElement(
  propName: string,
  schema: JsonSchema,
  isRequired: boolean,
  ctx: SchemaMapContext,
): csn.CsnElement {
  const notNull = isRequired || undefined;

  // Reference to another type
  if (schema?.$ref) {
    return { type: resolveTypeReference(schema, ctx.serviceName), notNull };
  }

  // Primitives
  switch (schema.type) {
    case 'string':
      return { type: csn.CdsBuiltinType.String, notNull };
    case 'boolean':
      return { type: csn.CdsBuiltinType.Boolean, notNull };
    case 'number':
      return { type: csn.CdsBuiltinType.DecimalFloat, notNull };
    case 'integer':
      return { type: csn.CdsBuiltinType.Integer, notNull };
  }

  // Nested object
  if (schema.type === 'object') {
    const nestedName = fqn(
      ctx.serviceName,
      sanitizeName(`${baseName(ctx.parentTypeName)}_${propName}`),
    );
    ctx.definitions[nestedName] = buildTypeFromSchema(
      nestedName,
      ensureObjectSchema(schema),
      ctx.serviceName,
      ctx.definitions,
    );
    return { type: nestedName, notNull };
  }

  // Array
  if (schema.type === 'array') {
    const arrayName = fqn(
      ctx.serviceName,
      sanitizeName(`${baseName(ctx.parentTypeName)}_${propName}_Array`),
    );
    if (!schema.items) throw new Error(`Array ${ctx.parentTypeName}.${propName} has no 'items'.`);

    ctx.definitions[arrayName] = {
      kind: 'type',
      name: arrayName,
      items: buildArrayItemsSpec(schema.items, { ...ctx, parentTypeName: arrayName }),
    };
    return { type: arrayName, notNull };
  }

  // Fallback
  return { type: csn.CdsBuiltinType.String, notNull };
}

function buildArrayItemsSpec(itemsSchema: JsonSchema, ctx: SchemaMapContext): csn.CsnTypeSpec {
  // Reference
  if (itemsSchema?.$ref) {
    return { type: resolveTypeReference(itemsSchema, ctx.serviceName) };
  }

  // Primitives
  switch (itemsSchema.type) {
    case 'string':
      return { type: csn.CdsBuiltinType.String };
    case 'boolean':
      return { type: csn.CdsBuiltinType.Boolean };
    case 'number':
      return { type: csn.CdsBuiltinType.DecimalFloat };
    case 'integer':
      return { type: csn.CdsBuiltinType.Integer };
  }

  // Object items (inline)
  if (itemsSchema.type === 'object') {
    const required = new Set(itemsSchema.required ?? []);
    const elements: Record<string, csn.CsnElement> = {};

    const properties = itemsSchema.properties ?? {};

    for (const name in properties) {
      if (Object.hasOwn(properties, name)) {
        const schema = properties[name];
        const safeName = sanitizeName(name);
        elements[safeName] = mapSchemaPropertyToElement(safeName, schema, required.has(name), {
          parentTypeName: fqn(ctx.serviceName, `${baseName(ctx.parentTypeName)}_Item`),
          serviceName: ctx.serviceName,
          definitions: ctx.definitions,
        });
      }
    }
    return { elements };
  }

  // Nested array
  if (itemsSchema.type === 'array') {
    if (!itemsSchema.items)
      throw new Error(`Nested array under ${ctx.parentTypeName} missing 'items'.`);
    return { items: buildArrayItemsSpec(itemsSchema.items, ctx) };
  }

  return { type: csn.CdsBuiltinType.String };
}

function resolveTypeReference(
  schema: { $ref?: string; refName?: string },
  serviceName: string,
): string {
  const ref = schema.$ref;
  if (!ref)
    throw new Error(`Invalid reference in ${serviceName} for ${schema.refName ?? 'unknown'}`);

  // Internal reference: #/definitions/date
  if (ref.startsWith('#/')) {
    const format = ref.split('/').pop();
    return mapDateFormatToCdsType(format);
  }

  // External artifact: $.uuid
  if (ref.startsWith('$.')) {
    const uid = ref.substring(2);
    const dataType = dataTypeCache.get(uid);

    if (dataType) {
      return fqn(serviceName, sanitizeName(dataType.name));
    }

    if (schema.refName) {
      LOG.warn(`Data type ${schema.refName} (${uid}) not in cache, using name`);
      return fqn(serviceName, sanitizeName(schema.refName));
    }

    LOG.warn(`Unknown artifact reference: ${ref}`);
    return fqn(serviceName, sanitizeName(uid));
  }

  // Fallback
  return fqn(serviceName, sanitizeName(schema.refName ?? ref));
}

function mapDateFormatToCdsType(format?: string): csn.CdsBuiltinType {
  switch (format) {
    case 'date':
      return csn.CdsBuiltinType.Date;
    case 'time':
      return csn.CdsBuiltinType.Time;
    case 'dateTime':
      return csn.CdsBuiltinType.Timestamp;
    default:
      return csn.CdsBuiltinType.String;
  }
}

function ensureObjectSchema(schema?: JsonSchema): JsonSchema {
  if (schema?.type === 'object' && schema.properties) {
    return schema;
  }
  return { type: 'object', properties: {}, required: [] };
}

// ============================================================================
//  UTILITIES
// ============================================================================

/** Create fully qualified name: "Service.TypeName" */
function fqn(qualifier: string, name: string): string {
  return `${qualifier}.${name}`;
}

/** Get the part after the last dot: "a.b.c" → "c" */
function baseName(name: string): string {
  return splitAtLastDot(name)[1];
}

/** Split at last dot: "a.b.c" → ["a.b", "c"] */
function splitAtLastDot(name: string): [string, string] {
  const i = name.lastIndexOf('.');
  return i === -1 ? ['', name] : [name.slice(0, i), name.slice(i + 1)];
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Convert to safe identifier: "foo-bar" → "foo_bar", "123x" → "_123x" */
function sanitizeName(name: string): string {
  return String(name)
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1');
}
