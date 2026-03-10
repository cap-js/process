import { CsnDefinition, CsnElement, CsnEntity } from '../../types/csn-extensions';
import { PROCESS_PREFIX, PROCESS_START_INPUTS } from '../constants';
import {
  InputCSNEntry,
  InputTreeNode,
  parseInputsArray,
  buildInputTree,
  EntityContext,
  WILDCARD,
  ParsedInputEntry,
} from '../shared/input-parser';

export type ElementType = {
  type: string;
  isMandatory?: boolean;
  isArray?: boolean;
  properties?: Record<string, ElementType>;
};

/**
 * Creates an EntityContext for build-time CSN entities
 */
export function createCsnEntityContext(
  elements: Record<string, CsnElement>,
  allDefinitions: Record<string, CsnDefinition>,
): EntityContext {
  return {
    getElement: (name: string) => {
      const element = elements[name];
      if (!element) return undefined;

      const isAssocOrComp =
        element.type === 'cds.Association' || element.type === 'cds.Composition';
      const targetDef = element.target ? allDefinitions[element.target] : undefined;
      const childElements =
        targetDef && targetDef.kind === 'entity'
          ? (targetDef.elements as Record<string, CsnElement>)
          : {};
      const targetEntity = createCsnEntityContext(childElements, allDefinitions);

      return { isAssocOrComp, targetEntity };
    },
  };
}

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
 * Handles two cases:
 * 1. `items: many TypeName` -> items.type is set
 * 2. `items: many { ID: UUID; }` -> items.elements is set (anonymous inline type)
 */
function resolveInlineArrayElement(
  element: { items?: { type?: string; elements?: Record<string, unknown> }; notNull?: boolean },
  allDefinitions: Record<string, CsnDefinition>,
  visited: Set<string>,
): ElementType | null {
  if (!element.items) return null;

  const isMandatory = element.notNull ?? false;
  const itemType = element.items.type;

  // Case 1: Anonymous inline array type with elements directly (e.g., `items: many { ID: UUID; }`)
  if (!itemType && element.items.elements) {
    const nestedElements = getProcessDefInputsAndTypes(
      { elements: element.items.elements } as CsnDefinition,
      allDefinitions,
      visited,
    );
    return { type: 'anonymous', isMandatory, isArray: true, properties: nestedElements };
  }

  // Case 2: Named type reference (e.g., `items: many ItemType`)
  if (!itemType) return null;

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
  element: {
    type?: string;
    items?: { type?: string; elements?: Record<string, unknown> };
    notNull?: boolean;
  },
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
        element as {
          type?: string;
          items?: { type?: string; elements?: Record<string, unknown> };
          notNull?: boolean;
        },
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

export function getParsedInputEntries(def: CsnEntity): ParsedInputEntry[] | undefined {
  const inputsCSN = def[PROCESS_START_INPUTS] as InputCSNEntry[] | undefined;
  if (!inputsCSN || inputsCSN.length === 0) {
    return undefined;
  }
  const parsedEntries = parseInputsArray(inputsCSN);
  return parsedEntries;
}

/**
 * Extracts element names and types from an entity definition based on the inputs array.
 * If no inputs array is defined, returns all entity fields.
 */
export function getElementNamesAndTypes(
  parsedEntries: ParsedInputEntry[] | undefined,
  def: CsnEntity,
  allDefinitions: Record<string, CsnDefinition>,
  entityContext: EntityContext,
): Record<string, ElementType> {
  const elements = def.elements ?? {};

  // If inputs array is defined, parse it to get specific fields
  if (parsedEntries) {
    const inputTree = buildInputTree(parsedEntries, entityContext);
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
    // Handle wildcard '*' (from $self) - expand all elements
    if (node.sourceElement === WILDCARD) {
      const allTypes = getAllElementTypes(elements, allDefinitions);
      Object.assign(result, allTypes);
      continue;
    }

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
 * Skips associations (they're structural, not data fields - their managed foreign keys are separate)
 * @param visitedTargets - Set of already visited target entity names (to prevent infinite recursion)
 */
function getAllElementTypes(
  elements: Record<string, CsnElement>,
  allDefinitions: Record<string, CsnDefinition>,
  visitedTargets: Set<string> = new Set(),
): Record<string, ElementType> {
  const result: Record<string, ElementType> = {};

  for (const name in elements) {
    const element = elements[name];
    const isAssociation = element.type === 'cds.Association';
    const isComposition = element.type === 'cds.Composition';
    const isMandatory = element['@mandatory'] === true;

    // Skip associations - they're structural metadata, not data fields
    // Their managed foreign keys (e.g., parent_ID) are separate elements
    if (isAssociation) {
      continue;
    }

    if (isComposition) {
      // For compositions, get the target entity's elements
      const targetDef = element.target ? allDefinitions[element.target] : undefined;

      // Skip if we've already visited this target (cyclic reference)
      if (element.target && visitedTargets.has(element.target)) {
        result[name] = {
          type: element.type,
          isMandatory,
          isArray: element.cardinality?.max === '*',
          properties: {}, // Don't expand cyclic references
        };
        continue;
      }

      const childElements =
        targetDef && targetDef.kind === 'entity'
          ? (targetDef.elements as Record<string, CsnElement>)
          : {};

      // Track visited target to prevent cycles
      const newVisited = new Set(visitedTargets);
      if (element.target) {
        newVisited.add(element.target);
      }

      result[name] = {
        type: element.type,
        isMandatory,
        isArray: element.cardinality?.max === '*',
        properties: getAllElementTypes(childElements, allDefinitions, newVisited),
      };
    } else {
      result[name] = { type: element.type, isMandatory };
    }
  }

  return result;
}
