import cds from '@sap/cds';
import * as csn from '../types/csn-extensions';
import { DataType, JsonSchema } from '../api';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { fqn, baseName, sanitizeName, EMPTY_OBJECT_SCHEMA } from './utils';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

interface SchemaMapContext {
  parentTypeName: string;
  serviceName: string;
  definitions: Record<string, csn.CsnDefinition>;
  dataTypeCache: Map<string, DataType>;
}

export function buildTypeFromSchema(
  typeName: string,
  schema: JsonSchema,
  serviceName: string,
  definitions: Record<string, csn.CsnDefinition>,
  dataTypeCache: Map<string, DataType>,
): csn.CsnType {
  const required = new Set(schema.required ?? []);
  const elements: Record<string, csn.CsnElement> = {};

  const properties = schema.properties ?? {};
  for (const propName in properties) {
    const propSchema = properties[propName];
    const safeName = sanitizeName(propName);
    elements[safeName] = mapSchemaPropertyToElement(safeName, propSchema, required.has(propName), {
      parentTypeName: typeName,
      serviceName,
      definitions,
      dataTypeCache,
    });
  }

  return { kind: 'type', name: typeName, elements };
}

export function ensureObjectSchema(schema?: JsonSchema): JsonSchema {
  if (schema?.type === 'object' && schema.properties) {
    return schema;
  }
  return EMPTY_OBJECT_SCHEMA;
}

/**
 * Resolve a JSON schema to a CDS type reference for $ref and primitive types.
 * Returns undefined for object, array, or unrecognized types (caller must handle).
 */
function resolvePrimitiveOrRef(
  schema: JsonSchema,
  serviceName: string,
  dataTypeCache: Map<string, DataType>,
): string | undefined {
  if (schema.$ref) return resolveTypeReference(schema, serviceName, dataTypeCache);
  switch (schema.type) {
    case 'string':
      return mapStringFormat(schema);
    case 'boolean':
      return csn.CdsBuiltinType.Boolean;
    case 'number':
      return csn.CdsBuiltinType.DecimalFloat;
    case 'integer':
      return csn.CdsBuiltinType.Integer;
    default:
      return undefined;
  }
}

function mapSchemaPropertyToElement(
  propName: string,
  schema: JsonSchema,
  isRequired: boolean,
  ctx: SchemaMapContext,
): csn.CsnElement {
  const notNull = isRequired || undefined;

  // Reference or primitive
  const primitiveType = resolvePrimitiveOrRef(schema, ctx.serviceName, ctx.dataTypeCache);
  if (primitiveType) return { type: primitiveType, notNull };

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
      ctx.dataTypeCache,
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
  // Reference or primitive
  const primitiveType = resolvePrimitiveOrRef(itemsSchema, ctx.serviceName, ctx.dataTypeCache);
  if (primitiveType) return { type: primitiveType };

  // Object items (inline)
  if (itemsSchema.type === 'object') {
    const required = new Set(itemsSchema.required ?? []);
    const elements: Record<string, csn.CsnElement> = {};

    const properties = itemsSchema.properties ?? {};

    for (const name in properties) {
      const schema = properties[name];
      const safeName = sanitizeName(name);
      elements[safeName] = mapSchemaPropertyToElement(safeName, schema, required.has(name), {
        parentTypeName: fqn(ctx.serviceName, `${baseName(ctx.parentTypeName)}_Item`),
        serviceName: ctx.serviceName,
        definitions: ctx.definitions,
        dataTypeCache: ctx.dataTypeCache,
      });
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
  dataTypeCache: Map<string, DataType>,
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
