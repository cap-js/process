import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import * as csn from '../types/csn-extensions';
import { getServiceCredentials, getServiceToken } from './auth';
import {
  createProcessApiClient,
  IProcessApiClient,
  ProcessHeader,
  DataType,
  JsonSchema
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

export async function importProcess(jsonFile: string, options: ImportOptions = {}): Promise<csn.CsnModel> {
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

  LOG.info('Retrieving process header...');
  const processHeader = await apiClient.fetchProcessHeader(projectId, processId);
  processHeader.projectId = projectId;

  if (processHeader.dependencies?.length) {
    LOG.info(`Fetching ${processHeader.dependencies.length} dependent data types...`);
    processHeader.dataTypes = await apiClient.fetchAllDataTypes(projectId, processHeader.dependencies);
    processHeader.dataTypes.forEach(dt => dataTypeCache.set(dt.uid, dt));
  }

  const outputPath = path.join(cds.root, 'srv', 'external', `${processName}.json`);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, JSON.stringify(processHeader, null, 2), 'utf8');

  const serviceName = `${projectId}.${capitalize(processHeader.identifier)}Service`;
  await addServiceToPackageJson(serviceName, `srv/external/${processName}`);

  return { filePath: outputPath, processHeader };
}

async function createApiClient(): Promise<IProcessApiClient> {
  const credentials = getServiceCredentials(PROCESS_SERVICE);
  if (!credentials) {
    throw new Error(cds.i18n.messages.at('IMPORT_NO_CREDENTIALS'));
  }

  const apiUrl = credentials.endpoints?.api;
  if (!apiUrl) {
    throw new Error(cds.i18n.messages.at('IMPORT_NO_API_URL'));
  }

  LOG.info('Creating API client...');
  return createProcessApiClient(apiUrl, async () => {
    const tokenInfo = await getServiceToken(PROCESS_SERVICE);
    return tokenInfo.jwt;
  });
}

// ============================================================================
//  STEP 2: GENERATE CSN MODEL
// ============================================================================

async function generateCsnModel(jsonFilePath: string): Promise<csn.CsnModel> {
  const processHeader = loadProcessHeader(jsonFilePath);
  const csnModel = buildCsnModel(processHeader);

  // Register service in package.json for local imports too
  const serviceName = `${processHeader.projectId}.${capitalize(processHeader.identifier)}Service`;
  const modelPath = getModelPathFromFilePath(jsonFilePath);
  await addServiceToPackageJson(serviceName, modelPath);

  return csnModel;
}

/**
 * Convert absolute/relative file path to model path for package.json
 * e.g., "./srv/external/foo.json" -> "srv/external/foo"
 *       "/abs/path/srv/external/foo.json" -> "srv/external/foo"
 */
function getModelPathFromFilePath(filePath: string): string {
  // Resolve to absolute, then make relative to cds.root
  const absolutePath = path.resolve(filePath);
  let relativePath = path.relative(cds.root, absolutePath);

  // Remove .json extension
  if (relativePath.endsWith('.json')) {
    relativePath = relativePath.slice(0, -5);
  }

  // Normalize path separators
  return relativePath.replace(/\\/g, '/');
}

function loadProcessHeader(filePath: string): ProcessHeader {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const header = JSON.parse(content) as ProcessHeader;

  header.dataTypes?.forEach(dt => dataTypeCache.set(dt.uid, dt));
  return header;
}

function buildCsnModel(process: ProcessHeader): csn.CsnModel {
  const serviceName = `${process.projectId}.${capitalize(process.identifier)}Service`;
  LOG.info(`Service name: ${serviceName}`);

  const definitions: Record<string, csn.CsnDefinition> = {};

  definitions[serviceName] = createServiceDefinition(serviceName, process);
  for (const dataType of dataTypeCache.values()) {
    addDataTypeDefinition(dataType, serviceName, definitions);
  }

  addProcessTypes(process, serviceName, definitions);
  addProcessActions(serviceName, definitions);

  return {
    $version: '2.0',
    definitions,
    meta: { creator: 'cds-import-process' }
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
    '@build.process': `${process.projectId}.${process.identifier}`
  };
}

function addDataTypeDefinition(dataType: DataType, serviceName: string, definitions: Record<string, csn.CsnDefinition>): void {
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

function addProcessTypes(process: ProcessHeader, serviceName: string, definitions: Record<string, csn.CsnDefinition>): void {
  const inputsName = fqn(serviceName, 'ProcessInputs');
  const outputsName = fqn(serviceName, 'ProcessOutputs');
  const attributesName = fqn(serviceName, 'ProcessAttributes');
  const instanceName = fqn(serviceName, 'ProcessInstance');

  definitions[inputsName] = buildTypeFromSchema(inputsName, ensureObjectSchema(process.header?.inputs), serviceName, definitions);
  definitions[outputsName] = buildTypeFromSchema(outputsName, ensureObjectSchema(process.header?.outputs), serviceName, definitions);
  definitions[attributesName] = buildTypeFromSchema(attributesName, ensureObjectSchema(process.header?.processAttributes), serviceName, definitions);

  definitions[instanceName] = {
    kind: 'type',
    name: instanceName,
    elements: {
      definitionId: { type: csn.CdsBuiltinType.String },
      definitionVersion: { type: csn.CdsBuiltinType.String },
      id: { type: csn.CdsBuiltinType.String },
      startedAt: { type: csn.CdsBuiltinType.String },
      startedBy: { type: csn.CdsBuiltinType.String }
    }
  };
}

// ============================================================================
//  CSN BUILDERS: ACTIONS
// ============================================================================

function addProcessActions(serviceName: string, definitions: Record<string, csn.CsnDefinition>): void {
  const inputsType = fqn(serviceName, 'ProcessInputs');
  const outputsType = fqn(serviceName, 'ProcessOutputs');
  const attributesType = fqn(serviceName, 'ProcessAttributes');
  const instanceType = fqn(serviceName, 'ProcessInstance');

  // Start action
  definitions[fqn(serviceName, 'start')] = {
    kind: 'action',
    name: fqn(serviceName, 'start'),
    params: {
      inputs: { type: inputsType, notNull: true }
    },
    returns: { type: instanceType }
  };

  // Query functions
  definitions[fqn(serviceName, 'getAttributes')] = {
    kind: 'function',
    name: fqn(serviceName, 'getAttributes'),
    params: {
      processInstanceId: { type: csn.CdsBuiltinType.String, notNull: true }
    },
    returns: { type: attributesType }
  };

  definitions[fqn(serviceName, 'getOutputs')] = {
    kind: 'function',
    name: fqn(serviceName, 'getOutputs'),
    params: {
      processInstanceId: { type: csn.CdsBuiltinType.String, notNull: true }
    },
    returns: { type: outputsType }
  };

  // Lifecycle actions
  for (const action of ['suspend', 'resume', 'cancel']) {
    definitions[fqn(serviceName, action)] = {
      kind: 'action',
      name: fqn(serviceName, action),
      params: {
        businessKey: { type: csn.CdsBuiltinType.String, notNull: true },
        cascade: { type: csn.CdsBuiltinType.Boolean }
      }
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
  definitions: Record<string, csn.CsnDefinition>
): csn.CsnType {
  const required = new Set(schema.required ?? []);
  const elements: Record<string, csn.CsnElement> = {};

  for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
    const safeName = sanitizeName(propName);
    elements[safeName] = mapSchemaPropertyToElement(safeName, propSchema, required.has(propName), {
      parentTypeName: typeName,
      serviceName,
      definitions
    });
  }

  return { kind: 'type', name: typeName, elements };
}

function mapSchemaPropertyToElement(propName: string, schema: JsonSchema, isRequired: boolean, ctx: SchemaMapContext): csn.CsnElement {
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
    const nestedName = fqn(ctx.serviceName, sanitizeName(`${baseName(ctx.parentTypeName)}_${propName}`));
    ctx.definitions[nestedName] = buildTypeFromSchema(nestedName, ensureObjectSchema(schema), ctx.serviceName, ctx.definitions);
    return { type: nestedName, notNull };
  }

  // Array
  if (schema.type === 'array') {
    const arrayName = fqn(ctx.serviceName, sanitizeName(`${baseName(ctx.parentTypeName)}_${propName}_Array`));
    if (!schema.items) throw new Error(cds.i18n.messages.at('IMPORT_ARRAY_NO_ITEMS', [ctx.parentTypeName, propName]));

    ctx.definitions[arrayName] = {
      kind: 'type',
      name: arrayName,
      items: buildArrayItemsSpec(schema.items, { ...ctx, parentTypeName: arrayName })
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

    for (const [name, schema] of Object.entries(itemsSchema.properties ?? {}) as [string, JsonSchema][]) {
      const safeName = sanitizeName(name);
      elements[safeName] = mapSchemaPropertyToElement(safeName, schema, required.has(name), {
        parentTypeName: fqn(ctx.serviceName, `${baseName(ctx.parentTypeName)}_Item`),
        serviceName: ctx.serviceName,
        definitions: ctx.definitions
      });
    }
    return { elements };
  }

  // Nested array
  if (itemsSchema.type === 'array') {
    if (!itemsSchema.items) throw new Error(cds.i18n.messages.at('IMPORT_NESTED_ARRAY_NO_ITEMS', [ctx.parentTypeName]));
    return { items: buildArrayItemsSpec(itemsSchema.items, ctx) };
  }

  return { type: csn.CdsBuiltinType.String };
}

function resolveTypeReference(schema: { $ref?: string; refName?: string }, serviceName: string): string {
  const ref = schema.$ref;
  if (!ref) throw new Error(cds.i18n.messages.at('IMPORT_INVALID_REF', [serviceName, schema.refName ?? 'unknown']));

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
    case 'date': return csn.CdsBuiltinType.Date;
    case 'time': return csn.CdsBuiltinType.Time;
    case 'dateTime': return csn.CdsBuiltinType.Timestamp;
    default: return csn.CdsBuiltinType.String;
  }
}

function ensureObjectSchema(schema?: JsonSchema): JsonSchema {
  if (schema?.type === 'object' && schema.properties) {
    return schema;
  }
  return { type: 'object', properties: {}, required: [] };
}

// ============================================================================
//  PACKAGE.JSON UPDATE
// ============================================================================

async function addServiceToPackageJson(serviceName: string, modelPath: string): Promise<void> {
  const packagePath = path.join(cds.root, 'package.json');

  try {
    const content = await fs.promises.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(content);

    pkg.cds ??= {};
    pkg.cds.requires ??= {};
    pkg.cds.requires[serviceName] = { kind: 'external', model: modelPath };

    await fs.promises.writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    LOG.info(`Added ${serviceName} to package.json`);
  } catch (error) {
    LOG.warn(`Could not update package.json: ${error}`);
  }
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
