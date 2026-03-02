import { CsnDefinition, CsnElement, CsnEntity } from '../../types/csn-extensions';
import { PROCESS_PREFIX, PROCESS_START_INPUTS } from '../constants';

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
 * CSN format types for parsing inputs array
 */
type SimpleInputCSN = { '=': string };
type AliasInputCSN = { path: { '=': string }; as: string };
type InputCSNEntry = SimpleInputCSN | AliasInputCSN;

/**
 * Parsed input entry with path segments and optional alias
 */
type ParsedInputEntry = {
  path: string[];
  alias?: string;
};

/**
 * Type guard for alias input entries
 */
function isAliasInput(entry: InputCSNEntry): entry is AliasInputCSN {
  return 'path' in entry && 'as' in entry;
}

/**
 * Parses a path string like "$self.items.title" into ["items", "title"]
 */
function parsePath(pathString: string): string[] {
  return pathString.replace(/^\$self\./, '').split('.');
}

/**
 * Parses the inputs CSN array into parsed entries
 */
function parseInputsCSN(inputsCSN: InputCSNEntry[]): ParsedInputEntry[] {
  return inputsCSN.map((entry) => {
    if (isAliasInput(entry)) {
      return {
        path: parsePath(entry.path['=']),
        alias: entry.as,
      };
    } else {
      return {
        path: parsePath(entry['=']),
        alias: undefined,
      };
    }
  });
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
    const parsedEntries = parseInputsCSN(inputsCSN);
    return buildElementTypesFromInputs(parsedEntries, elements, allDefinitions);
  }

  // No inputs array defined - return all entity fields
  return getAllElementTypes(elements, allDefinitions);
}

/**
 * Builds element types from parsed input entries
 */
function buildElementTypesFromInputs(
  entries: ParsedInputEntry[],
  elements: Record<string, CsnElement>,
  allDefinitions: Record<string, CsnDefinition>,
): Record<string, ElementType> {
  const result: Record<string, ElementType> = {};

  // Group entries by their root element
  const rootEntries: ParsedInputEntry[] = [];
  const nestedMap = new Map<string, ParsedInputEntry[]>();

  for (const entry of entries) {
    if (entry.path.length === 1) {
      rootEntries.push(entry);
    } else {
      const rootElement = entry.path[0];
      if (!nestedMap.has(rootElement)) {
        nestedMap.set(rootElement, []);
      }
      nestedMap.get(rootElement)!.push({
        path: entry.path.slice(1),
        alias: entry.alias,
      });
    }
  }

  // Collect root-level aliases for elements that also have nested entries
  const rootAliases = new Map<string, string>();
  for (const entry of rootEntries) {
    if (entry.alias) {
      rootAliases.set(entry.path[0], entry.alias);
    }
  }

  // Check which root elements have nested children
  const elementsWithChildren = new Set<string>(nestedMap.keys());

  // Process root-level entries
  for (const entry of rootEntries) {
    const elementName = entry.path[0];
    const element = elements[elementName];
    if (!element) continue;

    const keyName = entry.alias ?? elementName;
    const isAssociationOrComposition =
      element.type === 'cds.Association' || element.type === 'cds.Composition';
    const isMandatory = element['@mandatory'] === true;

    if (isAssociationOrComposition) {
      // If this element also has nested entries, skip adding it here - it will be handled below
      if (elementsWithChildren.has(elementName)) {
        continue;
      }

      // Association without specific child fields - expand all
      const targetDef = element.target ? allDefinitions[element.target] : undefined;
      const childElements =
        targetDef && targetDef.kind === 'entity'
          ? (targetDef.elements as Record<string, CsnElement>)
          : {};
      result[keyName] = {
        type: element.type,
        isMandatory,
        isArray: element.cardinality?.max === '*',
        properties: getAllElementTypes(childElements, allDefinitions),
      };
    } else {
      result[keyName] = { type: element.type, isMandatory };
    }
  }

  // Process nested entries (e.g., $self.items.ID, $self.items.title)
  for (const [rootElement, nestedEntries] of nestedMap) {
    const element = elements[rootElement];
    if (!element) continue;

    const keyName = rootAliases.get(rootElement) ?? rootElement;
    const isMandatory = element['@mandatory'] === true;

    const targetDef = element.target ? allDefinitions[element.target] : undefined;
    const childElements =
      targetDef && targetDef.kind === 'entity'
        ? (targetDef.elements as Record<string, CsnElement>)
        : {};

    // Recursively build element types for nested entries
    const nestedProperties = buildElementTypesFromInputs(
      nestedEntries,
      childElements,
      allDefinitions,
    );

    result[keyName] = {
      type: element.type,
      isMandatory,
      isArray: element.cardinality?.max === '*',
      properties: nestedProperties,
    };
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
