import cds from '@sap/cds';
import * as csn from '../../types/csn-extensions';
import { JsonSchema } from '../api';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { SchemaMapContext, getDataTypeCache } from './types';
import { fqn, baseName, sanitizeName } from './utils';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============================================================================
//  JSON SCHEMA → CSN CONVERSION
// ============================================================================

export function buildTypeFromSchema(
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
    const dataTypeCache = getDataTypeCache();
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

export function ensureObjectSchema(schema?: JsonSchema): JsonSchema {
  if (schema?.type === 'object' && schema.properties) {
    return schema;
  }
  return { type: 'object', properties: {}, required: [] };
}
