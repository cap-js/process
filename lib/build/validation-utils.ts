import { CsnDefinition, CsnElement, CsnEntity } from '../../types/csn-extensions';
import { PROCESS_PREFIX, PROCESS_START_INPUTS } from '../constants';
import {
  InputCSNEntry,
  InputTreeNode,
  parseInputsArray,
  buildInputTree,
  ElementResolver,
} from '../shared/input-parser';

export type ElementType = {
  type: string;
  isMandatory?: boolean;
  isArray?: boolean;
  properties?: Record<string, ElementType>;
};

/**
 * Context for CSN-based element resolution (used at build time)
 */
type CsnEntityContext = {
  elements: Record<string, CsnElement>;
  allDefinitions: Record<string, CsnDefinition>;
};

/**
 * Element resolver for build-time CSN entities
 */
const csnElementResolver: ElementResolver<CsnEntityContext> = {
  getElements: (ctx) => ctx.elements,
  isAssocOrComp: (element) => {
    const el = element as CsnElement;
    return el?.type === 'cds.Association' || el?.type === 'cds.Composition';
  },
  getTargetEntity: (element, currentCtx) => {
    const el = element as CsnElement;
    const targetDef = el.target ? currentCtx.allDefinitions[el.target] : undefined;
    const childElements =
      targetDef && targetDef.kind === 'entity'
        ? (targetDef.elements as Record<string, CsnElement>)
        : {};
    return {
      elements: childElements,
      allDefinitions: currentCtx.allDefinitions,
    };
  },
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
      const processId = def[PROCESS_PREFIX];
      if (processId) {
        def.name = name;
        processMap.set(processId, def);
      }
    }
  }

  return processMap;
}

/**
 * Extracts element names and types from an entity definition based on the inputs array.
 * If no inputs array is defined, returns all entity fields.
 */
export function getElementNamesAndTypes(
  def: CsnEntity,
  allDefinitions: Record<string, CsnDefinition>,
): Record<string, ElementType> {
  const elements = def.elements ?? {};
  const inputsCSN = def[PROCESS_START_INPUTS] as InputCSNEntry[] | undefined;

  // If inputs array is defined, parse it to get specific fields
  if (inputsCSN && inputsCSN.length > 0) {
    const parsedEntries = parseInputsArray(inputsCSN);
    const ctx: CsnEntityContext = {
      elements: elements as Record<string, CsnElement>,
      allDefinitions,
    };
    const inputTree = buildInputTree(parsedEntries, ctx, csnElementResolver);
    return convertTreeToElementTypes(
      inputTree,
      elements as Record<string, CsnElement>,
      allDefinitions,
    );
  }

  // No inputs array defined - return all entity fields
  return getAllElementTypes(elements as Record<string, CsnElement>, allDefinitions);
}

/**
 * Converts InputTreeNode[] to Record<string, ElementType>
 */
function convertTreeToElementTypes(
  tree: InputTreeNode[],
  elements: Record<string, CsnElement>,
  allDefinitions: Record<string, CsnDefinition>,
): Record<string, ElementType> {
  const result: Record<string, ElementType> = {};

  for (const node of tree) {
    const element = elements[node.sourceElement];
    if (!element) continue;

    const keyName = node.targetVariable ?? node.sourceElement;
    const isMandatory = element['@mandatory'] === true;

    if (node.associatedInputElements !== undefined) {
      // This is an association/composition
      const targetDef = element.target ? allDefinitions[element.target] : undefined;
      const childElements =
        targetDef && targetDef.kind === 'entity'
          ? (targetDef.elements as Record<string, CsnElement>)
          : {};

      if (node.associatedInputElements.length > 0) {
        // Has specific nested fields
        result[keyName] = {
          type: element.type,
          isMandatory,
          isArray: element.cardinality?.max === '*',
          properties: convertTreeToElementTypes(
            node.associatedInputElements,
            childElements,
            allDefinitions,
          ),
        };
      } else {
        // Expand all (*) - get all child element types
        result[keyName] = {
          type: element.type,
          isMandatory,
          isArray: element.cardinality?.max === '*',
          properties: getAllElementTypes(childElements, allDefinitions),
        };
      }
    } else {
      // Simple field
      result[keyName] = { type: element.type, isMandatory };
    }
  }

  return result;
}

/**
 * Gets all element types from an elements record (no filtering)
 */
function getAllElementTypes(
  elements: Record<string, CsnElement>,
  allDefinitions: Record<string, CsnDefinition>,
): Record<string, ElementType> {
  const result: Record<string, ElementType> = {};

  for (const name in elements) {
    const element = elements[name];
    const isAssociationOrComposition =
      element.type === 'cds.Association' || element.type === 'cds.Composition';
    const isMandatory = element['@mandatory'] === true;

    if (isAssociationOrComposition) {
      // For associations/compositions, get the target entity's elements
      const targetDef = element.target ? allDefinitions[element.target] : undefined;
      const childElements =
        targetDef && targetDef.kind === 'entity'
          ? (targetDef.elements as Record<string, CsnElement>)
          : {};

      result[name] = {
        type: element.type,
        isMandatory,
        isArray: element.cardinality?.max === '*',
        properties: getAllElementTypes(childElements, allDefinitions),
      };
    } else {
      result[name] = { type: element.type, isMandatory };
    }
  }

  return result;
}
