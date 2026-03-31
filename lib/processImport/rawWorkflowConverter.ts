import cds from '@sap/cds';
import { ProcessHeader, DataType, JsonSchema } from '../api';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { EMPTY_OBJECT_SCHEMA } from './utils';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

const CLASS_DEFINITION = 'com.sap.bpm.wfs.Model';

// ============================================================================
//  Raw SBPA workflow JSON types
// ============================================================================

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
  classDefinition: typeof CLASS_DEFINITION;
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
//  Public API
// ============================================================================

/**
 * Detect whether a parsed JSON object is a raw SBPA workflow JSON file
 * (has "contents" with a "com.sap.bpm.wfs.Model" entry).
 */
export function isRawWorkflowJson(parsed: unknown): boolean {
  const obj = parsed as RawWorkflowJson;
  if (!obj?.contents || typeof obj.contents !== 'object') return false;
  for (const key in obj.contents) {
    if (obj.contents[key]?.classDefinition === CLASS_DEFINITION) return true;
  }
  return false;
}

/**
 * Convert a raw SBPA workflow JSON file into the unified ProcessHeader format
 * that the CSN builder expects.
 */
export function convertWorkflowToProcessHeader(workflow: unknown): ProcessHeader {
  const contents = (workflow as RawWorkflowJson).contents;

  // Find the Model entry
  let modelEntry: RawWorkflowModelEntry | undefined;
  for (const key in contents) {
    if (contents[key]?.classDefinition === CLASS_DEFINITION) {
      modelEntry = contents[key] as RawWorkflowModelEntry;
      break;
    }
  }
  if (!modelEntry) {
    throw new Error('Raw workflow JSON does not contain a CLASSDEFINITION entry.');
  }

  const {
    projectId,
    processIdentifier: identifier,
    artifactId,
    name,
    schemas: schemasUid,
  } = modelEntry;

  // Find the Schemas entry
  const schemasEntry = contents[schemasUid] as RawWorkflowSchemasEntry | undefined;
  if (!schemasEntry?.schemas) {
    throw new Error('Raw workflow JSON does not contain a valid Schemas entry.');
  }

  // Separate process schema from data type schemas
  const processSchemaRef = `$.${artifactId}`;
  let processSchemaContent: RawProcessSchemaContent | null = null;
  const dataTypes: DataType[] = [];

  for (const schemaKey in schemasEntry.schemas) {
    const schema = schemasEntry.schemas[schemaKey];
    if (schema.schemaRef === processSchemaRef) {
      processSchemaContent = schema.content;
    } else {
      const uid = schema.schemaRef.startsWith('$.')
        ? schema.schemaRef.substring(2)
        : schema.schemaRef;
      const dtName = schema.content?.title ?? uid;
      dataTypes.push({
        uid,
        name: dtName,
        identifier: dtName,
        type: 'datatype',
        header: schema.content,
      });
    }
  }

  if (!processSchemaContent) {
    throw new Error(
      `Raw workflow JSON does not contain a schema entry with schemaRef "${processSchemaRef}".`,
    );
  }

  // Extract inputs (definitions.out) and outputs (definitions.in) from the process schema
  const inputs = processSchemaContent.definitions?.out ?? EMPTY_OBJECT_SCHEMA;
  const outputs = processSchemaContent.definitions?.in ?? EMPTY_OBJECT_SCHEMA;

  // Reconstruct $ref patterns in inputs/outputs for complex type properties.
  // In the raw format, complex types are inlined. We replace them with
  // $ref: "$.{uid}" references so buildCsnModel can resolve them via dataTypeCache.
  for (const dt of dataTypes) {
    restoreRefs(inputs, dt);
    restoreRefs(outputs, dt);
  }

  LOG.debug('Converted raw workflow JSON to ProcessHeader format.');

  return {
    uid: artifactId,
    name,
    identifier,
    type: 'bpi.process',
    projectId,
    header: { inputs, outputs, processAttributes: EMPTY_OBJECT_SCHEMA },
    dependencies:
      dataTypes.length > 0
        ? dataTypes.map((dt) => ({ artifactUid: dt.uid, type: 'both' as const }))
        : undefined,
    dataTypes: dataTypes.length > 0 ? dataTypes : undefined,
  };
}

// ============================================================================
//  Internal helpers
// ============================================================================

/**
 * Walk properties of a schema and replace inlined complex types with
 * $ref references when they match a known data type (by refName or title).
 */
function restoreRefs(schema: JsonSchema, dataType: DataType): void {
  if (!schema?.properties) return;

  const ref: JsonSchema = { $ref: `$.${dataType.uid}`, refName: dataType.name };

  for (const propName in schema.properties) {
    const prop = schema.properties[propName];
    if (!prop) continue;

    // Check arrays first because the array itself may also carry a refName
    if (prop.type === 'array' && prop.items && matchesDataType(prop.items, dataType)) {
      schema.properties[propName] = {
        type: 'array',
        items: ref,
        title: prop.title,
        description: prop.description,
        refName: prop.refName,
      };
    } else if (matchesDataType(prop, dataType)) {
      schema.properties[propName] = {
        ...ref,
        title: prop.title,
        description: prop.description,
      };
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
