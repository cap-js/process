import cds from '@sap/cds';
import { CsnDefinition, CsnElement, CsnEntity } from '../../types/csn-extensions';
import { PROCESS_INPUT } from '../constants';
import { ProcessValidationPlugin } from './plugin';
import { ERROR_CYCLE_DETECTED } from './constants';

const Plugin = cds.build?.Plugin;
const ERROR = Plugin?.ERROR;

export type ElementType = {
  type: string;
  isMandatory?: boolean;
  isArray?: boolean;
  properties?: Record<string, ElementType>;
};

/**
 * Checks if a type name is a complex (non-CDS built-in) type
 */
function isComplexType(typeName: string | undefined): boolean {
  return !!typeName && !typeName.startsWith('cds.');
}

/**
 * Checks if an object has an 'elements' property (structured type)
 */
function hasElements(obj: unknown): obj is { elements: Record<string, unknown> } {
  return typeof obj === 'object' && obj !== null && 'elements' in obj;
}

/**
 * Checks if an object has an 'items' property (array type)
 */
function hasItems(obj: unknown): obj is { items: { type?: string } } {
  return typeof obj === 'object' && obj !== null && 'items' in obj;
}

/**
 * Resolves an inline array element (has items but no type) to ElementType
 */
function resolveInlineArrayElement(
  element: { items?: { type?: string }; notNull?: boolean },
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): ElementType | null {
  const itemType = element.items?.type;
  if (!itemType) return null;

  const isMandatory = element.notNull ?? false;

  // Complex array item type - need to resolve nested elements
  if (isComplexType(itemType) && !visited.has(itemType)) {
    const newVisited = new Set(visited);
    newVisited.add(itemType);

    const typeDef = allDefinitions[itemType];
    if (typeDef && hasElements(typeDef)) {
      const nestedElements = getProcessDefInputsAndTypes(typeDef, allDefinitions, newVisited);
      return { type: itemType, isMandatory, isArray: true, properties: nestedElements };
    }
  }

  // Primitive array type or already visited
  return { type: itemType, isMandatory, isArray: true };
}

/**
 * Resolves an array type definition (type that has items property)
 */
function resolveArrayTypeDef(
  typeDef: { items?: { type?: string } },
  element: { notNull?: boolean },
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): ElementType | null {
  const itemType = typeDef.items?.type;
  if (!itemType) return null;

  const isMandatory = element.notNull ?? false;

  // Complex array item type
  if (isComplexType(itemType) && !visited.has(itemType)) {
    const itemVisited = new Set(visited);
    itemVisited.add(itemType);

    const itemTypeDef = allDefinitions[itemType];
    if (itemTypeDef && hasElements(itemTypeDef)) {
      const nestedElements = getProcessDefInputsAndTypes(itemTypeDef, allDefinitions, itemVisited);
      return { type: itemType, isMandatory, isArray: true, properties: nestedElements };
    }
    return { type: itemType, isMandatory, isArray: true };
  }

  // Primitive array type
  return { type: itemType, isMandatory, isArray: true };
}

/**
 * Resolves a complex type element (non-CDS type) to ElementType
 */
function resolveComplexTypeElement(
  element: { type: string; notNull?: boolean },
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): ElementType | null {
  // Already visited - skip to prevent cycles
  if (visited.has(element.type)) return null;

  const newVisited = new Set(visited);
  newVisited.add(element.type);

  const typeDef = allDefinitions[element.type];
  const isMandatory = element.notNull ?? false;

  // Type not found in definitions
  if (!typeDef) {
    return { type: element.type, isMandatory };
  }

  // Check if this type is an array type (has items)
  if (hasItems(typeDef)) {
    return resolveArrayTypeDef(typeDef, element, allDefinitions, newVisited);
  }

  // Regular complex type with elements
  if (hasElements(typeDef)) {
    const nestedElements = getProcessDefInputsAndTypes(typeDef, allDefinitions, newVisited);
    return { type: element.type, isMandatory, isArray: false, properties: nestedElements };
  }

  // Type found but has no elements and is not array
  return { type: element.type, isMandatory };
}

/**
 * Resolves a single element to its ElementType representation
 */
function resolveElementToType(
  element: { type?: string; items?: { type?: string }; notNull?: boolean },
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): ElementType | null {
  // Case 1: Inline array type (has items directly, no type property)
  if (element.type === undefined && element.items) {
    return resolveInlineArrayElement(element, allDefinitions, visited);
  }

  // Case 2: Complex type (non-CDS type)
  if (element.type && isComplexType(element.type)) {
    return resolveComplexTypeElement(
      element as { type: string; notNull?: boolean },
      allDefinitions,
      visited,
    );
  }

  // Case 3: Primitive CDS type
  if (element.type) {
    return { type: element.type, isMandatory: element.notNull ?? false };
  }

  return null;
}

/**
 * Extracts input types from a process definition
 */
export function getProcessDefInputsAndTypes(
  processDef: CsnDefinition,
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string> = new Set(),
): Record<string, ElementType> {
  const result: Record<string, ElementType> = {};

  // Process definitions store inputs in 'elements'
  if (!hasElements(processDef)) {
    return result;
  }

  const elements = processDef.elements;
  for (const name in elements) {
    if (Object.hasOwn(elements, name)) {
      const element = elements[name];
      const resolvedType = resolveElementToType(
        element as { type?: string; items?: { type?: string }; notNull?: boolean },
        allDefinitions,
        visited,
      );
      if (resolvedType) {
        result[name] = resolvedType;
      }
    }
  }
  return result;
}

/**
 * Extracts element names and types from an entity definition
 */
export function getElementNamesAndTypes(
  buildPlugin: ProcessValidationPlugin,
  def: CsnEntity,
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): Record<string, ElementType> {
  const elements = def.elements ?? {};

  // Check if at least one element has @build.process.input
  let hasInputAnnotation = false;
  for (const name in elements) {
    if (PROCESS_INPUT in elements[name]) {
      hasInputAnnotation = true;
      break;
    }
  }

  const result: Record<string, ElementType> = {};

  for (const name in elements) {
    const element = elements[name];

    // Skip elements without input annotation if any element has input annotation
    if (hasInputAnnotation && !(PROCESS_INPUT in element)) {
      continue;
    }
    const isAssociationOrComposition =
      element.type === 'cds.Association' || element.type === 'cds.Composition';
    const isMandatory = element['@mandatory'] === true;

    // Use annotation value or element name depending on if it is present
    const inputAnnotation = element[PROCESS_INPUT];
    const keyName = typeof inputAnnotation === 'string' ? inputAnnotation : name;

    if (isAssociationOrComposition) {
      const associatedProperties = getRecursiveElementNamesAndTypes(
        buildPlugin,
        hasInputAnnotation,
        element,
        keyName,
        allDefinitions,
        visited,
      );
      result[keyName] = {
        type: element.type,
        isMandatory,
        isArray: element.cardinality?.max === '*',
        properties: associatedProperties,
      };
    } else {
      result[keyName] = { type: element.type, isMandatory };
    }
  }

  return result;
}

/**
 * Recursively gets element names and types from associated entities
 */
function getRecursiveElementNamesAndTypes(
  buildPlugin: ProcessValidationPlugin,
  hasInputAnnotation: boolean,
  element: CsnElement,
  keyName: string,
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): Record<string, ElementType> {
  // When no annotation is present, do not include elements
  if (!hasInputAnnotation || !element.target) {
    return {};
  }

  // Prohibit cycles
  if (visited.has(element.target)) {
    buildPlugin.pushMessage(ERROR_CYCLE_DETECTED(element.target), ERROR);
    return {};
  }

  const targetDef = allDefinitions[element.target];
  if (!targetDef || targetDef.kind !== 'entity') {
    return {};
  }

  // Track visited entity to prevent cycles
  const newVisited = new Set(visited);
  newVisited.add(element.target);

  // Recursively get elements from associated entity
  const associatedElements = getElementNamesAndTypes(
    buildPlugin,
    targetDef,
    allDefinitions,
    newVisited,
  );

  // Return associated elements
  const result: Record<string, ElementType> = {};
  for (const assocName in associatedElements) {
    if (Object.hasOwn(associatedElements, assocName)) {
      const assocType = associatedElements[assocName];
      result[assocName] = assocType;
    }
  }
  return result;
}

/**
 * Gets all process definitions from model definitions
 */
export function getProcessDefinitions(
  allDefinitions: Record<string, CsnDefinition> | undefined,
): Map<string, CsnDefinition> {
  const processMap: Map<string, CsnDefinition> = new Map();

  if (!allDefinitions) {
    return processMap;
  }
  for (const name in allDefinitions) {
    if (Object.hasOwn(allDefinitions, name)) {
      const def = allDefinitions[name];
      const processId = def['@build.process'];
      if (processId) {
        def.name = name;
        processMap.set(processId, def);
      }
    }
  }

  return processMap;
}
