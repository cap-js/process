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

// --- Raw SBPA workflow JSON types ---

/** Top-level structure of a raw SBPA workflow JSON file. */
interface RawWorkflowJson {
  contents: Record<string, RawWorkflowEntry>;
}

/** Base shape for any entry inside `contents`. */
interface RawWorkflowEntry {
  classDefinition?: string;
  [key: string]: unknown;
}

/** The `com.sap.bpm.wfs.Model` entry. */
interface RawWorkflowModelEntry extends RawWorkflowEntry {
  classDefinition: 'com.sap.bpm.wfs.Model';
  projectId: string;
  processIdentifier: string;
  artifactId: string;
  name: string;
  /** UUID key pointing to the Schemas entry. */
  schemas: string;
}

/** The `com.sap.bpm.wfs.Schemas` entry. */
interface RawWorkflowSchemasEntry extends RawWorkflowEntry {
  classDefinition: 'com.sap.bpm.wfs.Schemas';
  schemas: Record<string, RawWorkflowSchemaItem>;
}

/** A single schema item inside the Schemas entry. */
interface RawWorkflowSchemaItem {
  schemaRef: string;
  content: JsonSchema & RawProcessSchemaContent;
}

/**
 * Additional structure on the process schema content (the one matching `$.{artifactId}`).
 * Data type schemas don't have `definitions.in` / `definitions.out`.
 */
interface RawProcessSchemaContent {
  definitions?: {
    out?: JsonSchema;
    in?: JsonSchema;
  };
}

// ============================================================================
//  MAIN ENTRY POINT
// ============================================================================

/**
 * Module-level cache for data types, populated during loadProcessHeader / fetchAndSaveProcessDefinition
 * and consumed by buildCsnModel → resolveTypeReference. Reset at the start of each importProcess call.
 * Call order: importProcess resets → loadProcessHeader populates → buildCsnModel reads.
 */
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cdsDk = cds as any;
      const resolve = cdsDk._localOrGlobal ?? cdsDk._local ?? require;
      const { env: bindingEnv } = resolve('@sap/cds-dk/lib/bind/shared');
      process.env.CDS_ENV ??= 'hybrid';
      cdsDk.env = cds.env.for('cds');
      Object.assign(process.env, await bindingEnv());
      cdsDk.env = cds.env.for('cds');
      credentials = getServiceCredentials(PROCESS_SERVICE);
    } catch (e) {
      LOG.debug('Auto-resolve bindings failed:', e);
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

// ============================================================================
//  RAW SBPA WORKFLOW JSON → PROCESS HEADER CONVERSION
// ============================================================================

/**
 * Raw SBPA workflow JSON is the format exported from the SAP Build Process Automation
 * design-time. It uses a `{ "contents": { ... } }` structure with entries keyed by
 * UUID, containing classDefinitions like "com.sap.bpm.wfs.Model", "com.sap.bpm.wfs.Schemas", etc.
 *
 * This is different from the ProcessHeader format returned by the unified API.
 */

function isRawWorkflowJson(parsed: unknown): boolean {
  const obj = parsed as RawWorkflowJson;
  if (!obj?.contents || typeof obj.contents !== 'object') return false;
  for (const key in obj.contents) {
    if (obj.contents[key]?.classDefinition === 'com.sap.bpm.wfs.Model') return true;
  }
  return false;
}

function convertWorkflowToProcessHeader(workflow: RawWorkflowJson): ProcessHeader {
  const contents = workflow.contents;

  // 1. Find the Model entry
  let modelEntry: RawWorkflowModelEntry | undefined;
  for (const key in contents) {
    if (contents[key]?.classDefinition === 'com.sap.bpm.wfs.Model') {
      modelEntry = contents[key] as RawWorkflowModelEntry;
      break;
    }
  }

  if (!modelEntry) {
    throw new Error('Raw workflow JSON does not contain a com.sap.bpm.wfs.Model entry.');
  }

  const projectId: string = modelEntry.projectId;
  const identifier: string = modelEntry.processIdentifier;
  const artifactId: string = modelEntry.artifactId;
  const name: string = modelEntry.name;

  // 2. Find the Schemas entry
  const schemasUid: string = modelEntry.schemas;
  const schemasEntry = contents[schemasUid] as RawWorkflowSchemasEntry | undefined;
  if (!schemasEntry?.schemas) {
    throw new Error('Raw workflow JSON does not contain a valid Schemas entry.');
  }

  // 3. Find the process schema (the one whose schemaRef matches $.{artifactId})
  const processSchemaRef = `$.${artifactId}`;
  let processSchemaContent: RawProcessSchemaContent | null = null;
  const dataTypeSchemas: Array<{ schemaRef: string; content: JsonSchema }> = [];

  for (const schemaKey of Object.keys(schemasEntry.schemas)) {
    const schema = schemasEntry.schemas[schemaKey];
    if (schema.schemaRef === processSchemaRef) {
      processSchemaContent = schema.content;
    } else {
      dataTypeSchemas.push({ schemaRef: schema.schemaRef, content: schema.content });
    }
  }

  if (!processSchemaContent) {
    throw new Error(
      `Raw workflow JSON does not contain a schema entry with schemaRef "${processSchemaRef}".`,
    );
  }

  // 4. Extract inputs (definitions.out) and outputs (definitions.in) from the process schema
  const inputs: JsonSchema = processSchemaContent?.definitions?.out ?? {
    type: 'object',
    properties: {},
    required: [],
  };
  const outputs: JsonSchema = processSchemaContent?.definitions?.in ?? {
    type: 'object',
    properties: {},
    required: [],
  };

  // 5. Build data types from non-process schemas
  const dataTypes: DataType[] = dataTypeSchemas.map((ds) => {
    const uid = ds.schemaRef.startsWith('$.') ? ds.schemaRef.substring(2) : ds.schemaRef;
    const dtName = ds.content?.title ?? uid;
    return {
      uid,
      name: dtName,
      identifier: dtName,
      type: 'datatype',
      header: ds.content,
    };
  });

  // 6. Build dependencies from data types
  const dependencies = dataTypes.map((dt) => ({
    artifactUid: dt.uid,
    type: 'both' as const,
  }));

  // 7. Reconstruct $ref patterns in inputs/outputs for complex type properties.
  //    In the raw format, complex types are inlined. We need to replace them with
  //    $ref: "$.{uid}" references so buildCsnModel can resolve them via dataTypeCache.
  for (const dt of dataTypes) {
    restoreRefs(inputs, dt);
    restoreRefs(outputs, dt);
  }

  return {
    uid: artifactId,
    name,
    identifier,
    type: 'bpi.process',
    projectId,
    header: {
      inputs,
      outputs,
      processAttributes: { type: 'object', properties: {}, required: [] },
    },
    dependencies: dependencies.length > 0 ? dependencies : undefined,
    dataTypes: dataTypes.length > 0 ? dataTypes : undefined,
  };
}

/**
 * Recursively walk properties of a schema and replace inlined complex types with
 * $ref references when they match a known data type (by refName or title).
 */
function restoreRefs(schema: JsonSchema, dataType: DataType): void {
  if (!schema?.properties) return;

  for (const propName of Object.keys(schema.properties)) {
    const prop = schema.properties[propName];
    if (!prop) continue;

    // Check if this is an array whose items match the data type (check arrays first
    // because the array itself may also carry a refName)
    if (prop.type === 'array' && prop.items && matchesDataType(prop.items, dataType)) {
      schema.properties[propName] = {
        type: 'array',
        items: {
          $ref: `$.${dataType.uid}`,
          refName: dataType.name,
        },
        ...(prop.title ? { title: prop.title } : {}),
        ...(prop.description !== undefined ? { description: prop.description } : {}),
        ...(prop.refName ? { refName: prop.refName } : {}),
      };
      continue;
    }

    // Check if this property is a direct inline of the data type
    if (matchesDataType(prop, dataType)) {
      schema.properties[propName] = {
        $ref: `$.${dataType.uid}`,
        refName: dataType.name,
        ...(prop.title ? { title: prop.title } : {}),
        ...(prop.description !== undefined ? { description: prop.description } : {}),
      };
      continue;
    }
  }
}

/**
 * Check if a schema property matches a data type by comparing refName or title.
 */
function matchesDataType(prop: JsonSchema, dataType: DataType): boolean {
  if (prop.refName && prop.refName === dataType.name) return true;
  // For inlined objects, the title on the data type content matches the data type name
  if (prop.type === 'object' && prop.title === dataType.header?.title) return true;
  return false;
}

function loadProcessHeader(filePath: string): ProcessHeader {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const parsed = JSON.parse(content);

  // Detect raw SBPA workflow JSON format (has "contents" with "com.sap.bpm.wfs.Model")
  if (isRawWorkflowJson(parsed)) {
    LOG.debug('Detected raw SBPA workflow JSON format, converting to ProcessHeader...');
    const header = convertWorkflowToProcessHeader(parsed);
    header.dataTypes?.forEach((dt) => dataTypeCache.set(dt.uid, dt));
    return header;
  }

  const header = parsed as ProcessHeader;
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
      return { type: mapStringFormat(schema), notNull };
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
      return { type: mapStringFormat(itemsSchema) };
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

/**
 * Map a string-typed JSON schema property to the correct CDS type,
 * taking into account the `format` property (used in raw workflow JSON).
 * Note: password-typed strings have no dedicated CDS type and map to String.
 */
function mapStringFormat(schema: JsonSchema): csn.CdsBuiltinType {
  if (schema.format) {
    switch (schema.format) {
      case 'date':
        return csn.CdsBuiltinType.Date;
      case 'date-time':
        return csn.CdsBuiltinType.Timestamp;
      case 'time':
        return csn.CdsBuiltinType.Time;
      default:
        return csn.CdsBuiltinType.String;
    }
  }
  return csn.CdsBuiltinType.String;
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
