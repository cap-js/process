/**
 * Simple CSN input format: { '=': '$self.field' }
 */
export type SimpleInputCSN = { '=': string };

/**
 * Aliased CSN input format: { path: { '=': '$self.field' }, as: 'alias' }
 */
export type AliasInputCSN = { path: { '=': string }; as: string };

/**
 * Union type for CSN input entries
 */
export type InputCSNEntry = SimpleInputCSN | AliasInputCSN;

/**
 * Parsed input entry with path segments and optional alias
 */
export type ParsedInputEntry = {
  path: string[];
  alias?: string;
};

type AnalyzeEntryGroupType = {
  directEntries: ParsedInputEntry[];
  nonAliasedDirect: ParsedInputEntry | undefined;
  aliasedDirect: ParsedInputEntry[];
  nestedEntries: ParsedInputEntry[];
};

type ClassifyElementResult = {
  kind: ElementKind;
  primaryAlias?: string;
  additionalAliasedNodes: { alias: string }[];
};

/**
 * Type guard for alias input entries
 */
export function isAliasInput(entry: InputCSNEntry): entry is AliasInputCSN {
  return 'path' in entry && 'as' in entry;
}

/**
 * Type guard for simple input entries
 */
export function isSimpleInput(entry: InputCSNEntry): entry is SimpleInputCSN {
  return '=' in entry && !('path' in entry);
}

/**
 * Special marker for selecting all scalar fields
 */
export const WILDCARD = '*' as const;

/**
 * Parses a path string like "$self.items.title" into ["items", "title"]
 * Strips the "$self." prefix and splits by "."
 *
 * Special case: "$self" alone returns ['*'] to indicate all scalar fields
 */
export function parsePath(pathString: string): string[] {
  // Handle $self alone - means all scalar fields
  if (pathString === '$self') {
    return [WILDCARD];
  }
  return pathString.replace(/^\$self\./, '').split('.');
}

/**
 * Parses the inputs CSN array into parsed entries
 *
 * @param inputsCSN - Array of CSN input entries from the annotation
 * @returns Array of parsed entries with path segments and optional alias
 *
 * @example
 * // Input:
 * [
 *   { '=': '$self' },                              // Wildcard: all scalar fields
 *   { '=': '$self.ID' },
 *   { '=': '$self.items.title' },
 *   { path: { '=': '$self.price' }, as: 'Amount' }
 * ]
 *
 * Output:
 * [
 *   { path: ['*'], alias: undefined },             // Wildcard marker
 *   { path: ['ID'], alias: undefined },
 *   { path: ['items', 'title'], alias: undefined },
 *   { path: ['price'], alias: 'Amount' }
 * ]
 */
export function parseInputsArray(inputsCSN: InputCSNEntry[] | undefined): ParsedInputEntry[] {
  if (!inputsCSN || inputsCSN.length === 0) {
    return [];
  }

  const parsedEntries: ParsedInputEntry[] = [];

  for (const entry of inputsCSN) {
    if (isAliasInput(entry)) {
      parsedEntries.push({
        path: parsePath(entry.path['=']),
        alias: entry.as,
      });
    } else if (isSimpleInput(entry)) {
      parsedEntries.push({
        path: parsePath(entry['=']),
        alias: undefined,
      });
    }
  }

  return parsedEntries;
}

/**
 * Represents a node in the input tree structure
 */
export type InputTreeNode = {
  sourceElement: string;
  targetVariable?: string;
  associatedInputElements?: InputTreeNode[];
};

/**
 * Represents an element in an entity (association or scalar field)
 */
export type EntityElement = {
  /** Whether this element is an association or composition */
  isAssocOrComp: boolean;
  /** The target entity for associations/compositions (self-referential for scalars) */
  targetEntity: EntityContext;
};

/**
 * Context for entity resolution - abstracts runtime and build-time entity access
 */
export type EntityContext = {
  /** Get an element by name, returning its type info and target entity */
  getElement: (name: string) => EntityElement | undefined;
};

/**
 * Classification of how an element group should be processed
 */
enum ElementKind {
  /** Simple scalar field */
  SCALAR = 'SCALAR',
  /** Association/Composition to expand all fields */
  ASSOC_EXPAND_ALL = 'ASSOC_EXPAND_ALL',
  /** Association/Composition with specific nested fields */
  ASSOC_WITH_NESTED = 'ASSOC_WITH_NESTED',
  /** Multiple aliases on same element (no non-aliased entry) */
  MULTI_ALIAS = 'MULTI_ALIAS',
}

/**
 * Preprocessed element group with all information needed for tree building
 */
type PreprocessedElement = {
  /** Element name (first segment of paths) */
  name: string;
  /** Classification of element kind */
  kind: ElementKind;
  /** Alias for the primary entry (if any) */
  primaryAlias?: string;
  /** Nested entries with first segment stripped */
  nestedEntries: ParsedInputEntry[];
  /** Additional aliased entries that create separate nodes */
  additionalAliasedNodes: { alias: string }[];
  /** Whether the element is an association/composition */
  isAssocOrComp: boolean;
  /** Target entity context for associations (resolved once) */
  targetEntity: EntityContext;
};

/**
 * Groups entries by their first path segment.
 *
 * This is the first step in preprocessing - it collects all entries that reference
 * the same root element so they can be analyzed together.
 *
 * @example
 *  Input: entries from annotation like:
 *  inputs: [$self.ID, $self.title, $self.items, $self.items.quantity]
 * const entries = [
 *   { path: ['ID'], alias: undefined },
 *   { path: ['title'], alias: undefined },
 *   { path: ['items'], alias: undefined },
 *   { path: ['items', 'quantity'], alias: undefined }
 * ];
 *
 *  Output: Map grouping by first segment
 *  Map {
 *    'ID'    => [{ path: ['ID'], alias: undefined }],
 *    'title' => [{ path: ['title'], alias: undefined }],
 *    'items' => [
 *      { path: ['items'], alias: undefined },           // direct reference
 *      { path: ['items', 'quantity'], alias: undefined } // nested reference
 *    ]
 *  }
 *
 * @example
 *  Multiple aliases on same element:
 *  inputs: [{ path: $self.ID, as: 'OrderId' }, { path: $self.ID, as: 'RefId' }]
 * const entries = [
 *   { path: ['ID'], alias: 'OrderId' },
 *   { path: ['ID'], alias: 'RefId' }
 * ];
 *
 *  Output:
 *  Map {
 *    'ID' => [
 *      { path: ['ID'], alias: 'OrderId' },
 *      { path: ['ID'], alias: 'RefId' }
 *    ]
 *  }
 */
function groupEntriesByFirstSegment(entries: ParsedInputEntry[]): Map<string, ParsedInputEntry[]> {
  const groups = new Map<string, ParsedInputEntry[]>();

  for (const entry of entries) {
    const firstSegment = entry.path[0];
    if (!groups.has(firstSegment)) {
      groups.set(firstSegment, []);
    }
    groups.get(firstSegment)!.push(entry);
  }

  return groups;
}

/**
 * Analyzes a group of entries for the same element and categorizes them.
 *
 * Separates entries into:
 * - directEntries: References to the element itself (path length = 1)
 * - nonAliasedDirect: The first direct entry without an alias (used as primary)
 * - aliasedDirect: Direct entries with aliases (may create additional nodes)
 * - nestedEntries: References to nested fields (path length > 1), with first segment stripped
 *
 * @example
 *  Simple scalar field: [$self.ID]
 * analyzeEntryGroup([{ path: ['ID'], alias: undefined }])
 *  Returns:
 *  {
 *    directEntries: [{ path: ['ID'], alias: undefined }],
 *    nonAliasedDirect: { path: ['ID'], alias: undefined },
 *    aliasedDirect: [],
 *    nestedEntries: []
 *  }
 *
 * @example
 *  Composition with nested fields: [$self.items, $self.items.quantity, $self.items.price]
 * analyzeEntryGroup([
 *   { path: ['items'], alias: undefined },
 *   { path: ['items', 'quantity'], alias: undefined },
 *   { path: ['items', 'price'], alias: undefined }
 * ])
 *  Returns:
 *  {
 *    directEntries: [{ path: ['items'], alias: undefined }],
 *    nonAliasedDirect: { path: ['items'], alias: undefined },
 *    aliasedDirect: [],
 *    nestedEntries: [
 *      { path: ['quantity'], alias: undefined },  // 'items' stripped
 *      { path: ['price'], alias: undefined }      // 'items' stripped
 *    ]
 *  }
 *
 * @example
 *  Multiple aliases without non-aliased: [{ path: $self.ID, as: 'OrderId' }, { path: $self.ID, as: 'RefId' }]
 * analyzeEntryGroup([
 *   { path: ['ID'], alias: 'OrderId' },
 *   { path: ['ID'], alias: 'RefId' }
 * ])
 *  Returns:
 *  {
 *    directEntries: [{ path: ['ID'], alias: 'OrderId' }, { path: ['ID'], alias: 'RefId' }],
 *    nonAliasedDirect: undefined,  // No non-aliased entry!
 *    aliasedDirect: [{ path: ['ID'], alias: 'OrderId' }, { path: ['ID'], alias: 'RefId' }],
 *    nestedEntries: []
 *  }
 *
 * @example
 * Both aliased and non-aliased: [$self.ID, { path: $self.ID, as: 'EntityId' }]
 * analyzeEntryGroup([
 *   { path: ['ID'], alias: undefined },
 *   { path: ['ID'], alias: 'EntityId' }
 * ])
 *  Returns:
 *  {
 *    directEntries: [{ path: ['ID'], alias: undefined }, { path: ['ID'], alias: 'EntityId' }],
 *    nonAliasedDirect: { path: ['ID'], alias: undefined },
 *    aliasedDirect: [{ path: ['ID'], alias: 'EntityId' }],
 *    nestedEntries: []
 *  }
 */
function analyzeEntryGroup(group: ParsedInputEntry[]): AnalyzeEntryGroupType {
  const directEntries = group.filter((e) => e.path.length === 1);
  const nonAliasedDirect = directEntries.find((e) => !e.alias);
  const aliasedDirect = directEntries.filter((e) => e.alias);
  const nestedEntries = group
    .filter((e) => e.path.length > 1)
    .map((e) => ({ path: e.path.slice(1), alias: e.alias }));

  return { directEntries, nonAliasedDirect, aliasedDirect, nestedEntries };
}

/**
 * Classifies an element and determines how it should be processed.
 *
 * This determines which state machine handler will process the element:
 * - SCALAR: Simple field → creates one node (+ extra nodes for additional aliases)
 * - ASSOC_EXPAND_ALL: Composition without nested fields → expands all fields
 * - ASSOC_WITH_NESTED: Composition with specific nested fields → recurses
 * - MULTI_ALIAS: Multiple aliases without non-aliased entry → creates node per alias
 *
 * @example
 *  Case 1: MULTI_ALIAS - Multiple aliases, no non-aliased entry
 *  inputs: [{ path: $self.ID, as: 'OrderId' }, { path: $self.ID, as: 'RefId' }]
 * classifyElement('ID', {
 *   nonAliasedDirect: undefined,
 *   aliasedDirect: [{ path: ['ID'], alias: 'OrderId' }, { path: ['ID'], alias: 'RefId' }],
 *   nestedEntries: []
 * }, false)
 *  Returns: { kind: MULTI_ALIAS, primaryAlias: undefined, additionalAliasedNodes: [{ alias: 'OrderId' }, { alias: 'RefId' }] }
 *  Result: Two separate nodes, one per alias
 *
 * @example
 *  Case 2: SCALAR with additional aliases - Both aliased and non-aliased
 *  inputs: [$self.ID, { path: $self.ID, as: 'EntityId' }]
 * classifyElement('ID', {
 *   nonAliasedDirect: { path: ['ID'], alias: undefined },
 *   aliasedDirect: [{ path: ['ID'], alias: 'EntityId' }],
 *   nestedEntries: []
 * }, false)
 *  Returns: { kind: SCALAR, primaryAlias: undefined, additionalAliasedNodes: [{ alias: 'EntityId' }] }
 *  Result: Primary node 'ID', plus extra node 'EntityId'
 *
 * @example
 *  Case 3: ASSOC_WITH_NESTED - Composition with specific nested fields
 *  inputs: [$self.items.quantity, $self.items.price]
 * classifyElement('items', {
 *   nonAliasedDirect: undefined,
 *   aliasedDirect: [],
 *   nestedEntries: [{ path: ['quantity'] }, { path: ['price'] }]
 * }, true)
 *  Returns: { kind: ASSOC_WITH_NESTED, primaryAlias: undefined, additionalAliasedNodes: [] }
 *  Result: items node with nested quantity and price
 *
 * @example
 *  Case 4: ASSOC_EXPAND_ALL - Composition without nested fields
 *  inputs: [$self.items]
 * classifyElement('items', {
 *   nonAliasedDirect: { path: ['items'], alias: undefined },
 *   aliasedDirect: [],
 *   nestedEntries: []
 * }, true)
 *  Returns: { kind: ASSOC_EXPAND_ALL, primaryAlias: undefined, additionalAliasedNodes: [] }
 *  Result: items node that expands all fields (associatedInputElements: [])
 *
 * @example
 *  Case 5: Simple SCALAR
 *  inputs: [$self.title]
 * classifyElement('title', {
 *   nonAliasedDirect: { path: ['title'], alias: undefined },
 *   aliasedDirect: [],
 *   nestedEntries: []
 * }, false)
 *  Returns: { kind: SCALAR, primaryAlias: undefined, additionalAliasedNodes: [] }
 *  Result: Simple { sourceElement: 'title' } node
 */
function classifyElement(
  analysis: ReturnType<typeof analyzeEntryGroup>,
  isAssocOrComp: boolean,
): ClassifyElementResult {
  const { nonAliasedDirect, aliasedDirect, nestedEntries } = analysis;

  // Case 1: Multiple aliases without non-aliased entry → MULTI_ALIAS
  // e.g., [{ path: $self.ID, as: 'OrderId' }, { path: $self.ID, as: 'RefId' }]
  if (aliasedDirect.length > 1 && !nonAliasedDirect) {
    return {
      kind: ElementKind.MULTI_ALIAS,
      primaryAlias: undefined,
      additionalAliasedNodes: aliasedDirect.map((e) => ({ alias: e.alias! })),
    };
  }

  // Case 2: Scalar field with both aliased and non-aliased entries
  // e.g., [$self.ID, { path: $self.ID, as: 'EntityId' }]
  // → primary is non-aliased, aliased become additional nodes
  if (!isAssocOrComp && aliasedDirect.length > 0 && nonAliasedDirect) {
    return {
      kind: ElementKind.SCALAR,
      primaryAlias: undefined,
      additionalAliasedNodes: aliasedDirect.map((e) => ({ alias: e.alias! })),
    };
  }

  // Case 3: Association with nested entries → ASSOC_WITH_NESTED
  if (nestedEntries.length > 0) {
    return {
      kind: ElementKind.ASSOC_WITH_NESTED,
      primaryAlias: analysis.directEntries[0]?.alias,
      additionalAliasedNodes: [],
    };
  }

  // Case 4: Association without nested → ASSOC_EXPAND_ALL
  if (isAssocOrComp) {
    return {
      kind: ElementKind.ASSOC_EXPAND_ALL,
      primaryAlias: analysis.directEntries[0]?.alias,
      additionalAliasedNodes: [],
    };
  }

  // Case 5: Simple scalar field → SCALAR
  return {
    kind: ElementKind.SCALAR,
    primaryAlias: analysis.directEntries[0]?.alias,
    additionalAliasedNodes: [],
  };
}

/**
 * Preprocesses all entries into enriched element descriptors.
 *
 * This is the main preprocessing function that does all upfront analysis:
 * 1. Groups entries by first segment
 * 2. Resolves element types (scalar vs association/composition)
 * 3. Classifies how each element should be processed
 * 4. Prepares nested entries with wildcard injection if needed
 *
 * The result is a flat list of PreprocessedElement objects that the state machine
 * can process sequentially without any additional lookups or analysis.
 *
 * @example
 *  Full preprocessing example:
 *  Entity: { ID: scalar, title: scalar, items: Composition of Items }
 *  Items: { quantity: Integer, price: Decimal }
 *
 *  Annotation inputs: [$self.ID, $self.title, $self.items, $self.items.quantity]
 *
 * preprocessEntries([
 *   { path: ['ID'], alias: undefined },
 *   { path: ['title'], alias: undefined },
 *   { path: ['items'], alias: undefined },
 *   { path: ['items', 'quantity'], alias: undefined }
 * ], rootEntity, resolver)
 *
 *  Returns:
 *  [
 *    {
 *      name: 'ID',
 *      kind: SCALAR,
 *      primaryAlias: undefined,
 *      nestedEntries: [],
 *      additionalAliasedNodes: [],
 *      isAssocOrComp: false,
 *      element: <ID element>,
 *      targetEntity: rootEntity
 *    },
 *    {
 *      name: 'title',
 *      kind: SCALAR,
 *      primaryAlias: undefined,
 *      nestedEntries: [],
 *      additionalAliasedNodes: [],
 *      isAssocOrComp: false,
 *      element: <title element>,
 *      targetEntity: rootEntity
 *    },
 *    {
 *      name: 'items',
 *      kind: ASSOC_WITH_NESTED,
 *      primaryAlias: undefined,
 *      nestedEntries: [
 *        { path: ['*'], alias: undefined },        // Wildcard injected!
 *        { path: ['quantity'], alias: undefined }
 *      ],
 *      additionalAliasedNodes: [],
 *      isAssocOrComp: true,
 *      targetEntity: <Items entity context>
 *    }
 * ]
 *
 *  Note: The wildcard ['*'] was injected because we have both:
 *  - $self.items (expand all) AND $self.items.quantity (specific nested)
 *  This means "expand all items fields PLUS include quantity explicitly (for aliasing)"
 *
 * @example
 *  Multiple aliases preprocessing:
 *  inputs: [{ path: $self.ID, as: 'OrderId' }, { path: $self.ID, as: 'RefId' }]
 *
 * preprocessEntries([
 *   { path: ['ID'], alias: 'OrderId' },
 *   { path: ['ID'], alias: 'RefId' }
 * ], rootEntity)
 *
 *  Returns:
 *  [
 *    {
 *      name: 'ID',
 *      kind: MULTI_ALIAS,
 *      primaryAlias: undefined,
 *      nestedEntries: [],
 *      additionalAliasedNodes: [{ alias: 'OrderId' }, { alias: 'RefId' }],
 *      isAssocOrComp: false,
 *      targetEntity: rootEntity
 *    }
 *  ]
 */
function preprocessEntries(
  entries: ParsedInputEntry[],
  rootEntity: EntityContext,
): PreprocessedElement[] {
  const groups = groupEntriesByFirstSegment(entries);
  const result: PreprocessedElement[] = [];

  for (const [elementName, group] of groups) {
    const element = rootEntity.getElement(elementName);
    const isAssocOrComp = element?.isAssocOrComp ?? false;
    const targetEntity = element?.targetEntity ?? rootEntity;

    const analysis = analyzeEntryGroup(group);
    const classification = classifyElement(analysis, isAssocOrComp);

    // Prepare nested entries with wildcard injection for composition expand-all + nested fields
    let nestedEntries = analysis.nestedEntries;
    if (
      isAssocOrComp &&
      analysis.nonAliasedDirect &&
      nestedEntries.length > 0 &&
      classification.kind !== ElementKind.MULTI_ALIAS
    ) {
      // Inject wildcard to expand all fields plus specific nested fields
      nestedEntries = [{ path: [WILDCARD], alias: undefined }, ...nestedEntries];
    }

    result.push({
      name: elementName,
      kind: classification.kind,
      primaryAlias: classification.primaryAlias,
      nestedEntries,
      additionalAliasedNodes: classification.additionalAliasedNodes,
      isAssocOrComp,
      targetEntity,
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * State Machine for building input tree from preprocessed elements
 *
 * Simplified Grammar (after preprocessing):
 *   <start>       ::= INIT
 *   INIT          ::= NEXT_ELEMENT
 *   NEXT_ELEMENT  ::= SELECT_HANDLER | DONE
 *   SELECT_HANDLER::= BUILD_SCALAR | BUILD_ASSOC_EXPAND | BUILD_ASSOC_NESTED | BUILD_MULTI_ALIAS
 *   BUILD_*       ::= ADD_EXTRA_ALIASES
 *   ADD_EXTRA     ::= NEXT_ELEMENT
 *   <end>         ::= DONE
 */
enum BuildState {
  /** Initialize processing */
  INIT = 'INIT',
  /** Move to next element */
  NEXT_ELEMENT = 'NEXT_ELEMENT',
  /** Select appropriate handler based on element kind */
  SELECT_HANDLER = 'SELECT_HANDLER',
  /** Build a simple scalar field node */
  BUILD_SCALAR = 'BUILD_SCALAR',
  /** Build an association node that expands all fields */
  BUILD_ASSOC_EXPAND = 'BUILD_ASSOC_EXPAND',
  /** Build an association node with specific nested fields */
  BUILD_ASSOC_NESTED = 'BUILD_ASSOC_NESTED',
  /** Build multiple nodes for multi-alias case */
  BUILD_MULTI_ALIAS = 'BUILD_MULTI_ALIAS',
  /** Add any additional aliased nodes */
  ADD_EXTRA_ALIASES = 'ADD_EXTRA_ALIASES',
  /** Processing complete */
  DONE = 'DONE',
}

/**
 * Builds a tree structure from parsed input entries
 *
 * @param entries - Parsed input entries from parseInputsArray
 * @param rootEntity - The root entity context to resolve elements from
 *
 * @example
 * Input → Output mappings:
 *
 * 1. Wildcard (all scalar fields):
 *    [{ path: ['*'] }] → [{ sourceElement: '*' }]
 *
 * 2. Simple field:
 *    [{ path: ['ID'] }] → [{ sourceElement: 'ID' }]
 *
 * 3. Association (expand all) - 'items' is a Composition:
 *    [{ path: ['items'] }] → [{ sourceElement: 'items', associatedInputElements: [] }]
 *
 * 4. Nested path:
 *    [{ path: ['items', 'title'] }]
 *    → [{ sourceElement: 'items', associatedInputElements: [{ sourceElement: 'title' }] }]
 *
 * 5. With alias:
 *    [{ path: ['price'], alias: 'Amount' }]
 *    → [{ sourceElement: 'price', targetVariable: 'Amount' }]
 *
 * 6. Composition expand-all + nested alias:
 *    [{ path: ['items'] }, { path: ['items', 'ID'], alias: 'ItemId' }]
 *    → [{ sourceElement: 'items', associatedInputElements: [
 *         { sourceElement: '*' },
 *         { sourceElement: 'ID', targetVariable: 'ItemId' }
 *       ]}]
 *
 * 7. Multiple aliases on scalar (no non-aliased entry):
 *    [{ path: ['ID'], alias: 'OrderId' }, { path: ['ID'], alias: 'RefId' }]
 *    → [{ sourceElement: 'ID', targetVariable: 'OrderId' },
 *       { sourceElement: 'ID', targetVariable: 'RefId' }]
 *
 * 8. Multiple aliases on composition:
 *    [{ path: ['items'], alias: 'Order' }, { path: ['items'], alias: 'ItemOrder' }]
 *    → [{ sourceElement: 'items', targetVariable: 'Order', associatedInputElements: [] },
 *       { sourceElement: 'items', targetVariable: 'ItemOrder', associatedInputElements: [] }]
 *
 * @returns Tree of InputTreeNode representing the input structure
 */
export function buildInputTree(
  entries: ParsedInputEntry[],
  rootEntity: EntityContext,
): InputTreeNode[] {
  if (entries.length === 0) {
    return [];
  }
  // Preprocess entries to classify and enrich them for easier processing in the state machine
  const preprocessedElements = preprocessEntries(entries, rootEntity);

  const result: InputTreeNode[] = [];
  let state: BuildState = BuildState.INIT;
  let currentIndex = 0;
  let currentElement: PreprocessedElement | null = null;

  while (state !== BuildState.DONE) {
    switch (state) {
      case BuildState.INIT: {
        currentIndex = 0;
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.NEXT_ELEMENT: {
        if (currentIndex >= preprocessedElements.length) {
          state = BuildState.DONE;
        } else {
          currentElement = preprocessedElements[currentIndex];
          state = BuildState.SELECT_HANDLER;
        }
        break;
      }

      case BuildState.SELECT_HANDLER: {
        switch (currentElement!.kind) {
          case ElementKind.SCALAR:
            state = BuildState.BUILD_SCALAR;
            break;
          case ElementKind.ASSOC_EXPAND_ALL:
            state = BuildState.BUILD_ASSOC_EXPAND;
            break;
          case ElementKind.ASSOC_WITH_NESTED:
            state = BuildState.BUILD_ASSOC_NESTED;
            break;
          case ElementKind.MULTI_ALIAS:
            state = BuildState.BUILD_MULTI_ALIAS;
            break;
        }
        break;
      }

      case BuildState.BUILD_SCALAR: {
        result.push({
          sourceElement: currentElement!.name,
          targetVariable: currentElement!.primaryAlias,
        });
        state = BuildState.ADD_EXTRA_ALIASES;
        break;
      }

      case BuildState.BUILD_ASSOC_EXPAND: {
        result.push({
          sourceElement: currentElement!.name,
          targetVariable: currentElement!.primaryAlias,
          associatedInputElements: [],
        });
        state = BuildState.ADD_EXTRA_ALIASES;
        break;
      }

      case BuildState.BUILD_ASSOC_NESTED: {
        const nestedResults = buildInputTree(
          currentElement!.nestedEntries,
          currentElement!.targetEntity,
        );
        result.push({
          sourceElement: currentElement!.name,
          targetVariable: currentElement!.primaryAlias,
          associatedInputElements: nestedResults,
        });
        state = BuildState.ADD_EXTRA_ALIASES;
        break;
      }

      case BuildState.BUILD_MULTI_ALIAS: {
        // Build a node for each alias
        for (const { alias } of currentElement!.additionalAliasedNodes) {
          if (currentElement!.isAssocOrComp) {
            if (currentElement!.nestedEntries.length > 0) {
              const nestedResults = buildInputTree(
                currentElement!.nestedEntries,
                currentElement!.targetEntity,
              );
              result.push({
                sourceElement: currentElement!.name,
                targetVariable: alias,
                associatedInputElements: nestedResults,
              });
            } else {
              result.push({
                sourceElement: currentElement!.name,
                targetVariable: alias,
                associatedInputElements: [],
              });
            }
          } else {
            result.push({
              sourceElement: currentElement!.name,
              targetVariable: alias,
            });
          }
        }
        // Skip ADD_EXTRA_ALIASES since MULTI_ALIAS handles all aliases
        currentIndex++;
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.ADD_EXTRA_ALIASES: {
        // Add any additional aliased nodes (e.g., from [$self.ID, { path: $self.ID, as: 'EntityId' }])
        for (const { alias } of currentElement!.additionalAliasedNodes) {
          result.push({
            sourceElement: currentElement!.name,
            targetVariable: alias,
          });
        }
        currentIndex++;
        state = BuildState.NEXT_ELEMENT;
        break;
      }
    }
  }

  return result;
}
