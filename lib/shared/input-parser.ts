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

// ═══════════════════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parses a path string like "$self.items.title" into ["items", "title"]
 * Strips the "$self." prefix and splits by "."
 */
export function parsePath(pathString: string): string[] {
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
 *   { '=': '$self.ID' },
 *   { '=': '$self.items.title' },
 *   { path: { '=': '$self.price' }, as: 'Amount' }
 * ]
 *
 * // Output:
 * [
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

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TREE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Represents a node in the input tree structure
 */
export type InputTreeNode = {
  sourceElement: string;
  targetVariable?: string;
  associatedInputElements?: InputTreeNode[];
};

// ═══════════════════════════════════════════════════════════════════════════
// INPUT TREE BUILDER
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Context required to resolve element types during tree building
 */
export type ElementResolver<TEntity> = {
  /** Get the elements map from an entity */
  getElements: (entity: TEntity) => Record<string, unknown> | undefined;
  /** Check if an element is an association or composition */
  isAssocOrComp: (element: unknown) => boolean;
  /** Get the target entity for an association/composition element */
  getTargetEntity: (element: unknown, currentEntity: TEntity) => TEntity;
};

/**
 * State Machine for building input tree from parsed entries
 *
 * Grammar (BNF-style State Transitions):
 *   <start>           ::= GROUP_ENTRIES
 *   GROUP_ENTRIES     ::= PROCESS_ELEMENT
 *   PROCESS_ELEMENT   ::= CHECK_NESTED | DONE
 *   CHECK_NESTED      ::= BUILD_SIMPLE | BUILD_ASSOC | BUILD_NESTED
 *   BUILD_SIMPLE      ::= NEXT_ELEMENT
 *   BUILD_ASSOC       ::= NEXT_ELEMENT
 *   BUILD_NESTED      ::= NEXT_ELEMENT
 *   NEXT_ELEMENT      ::= PROCESS_ELEMENT | DONE
 *   <end>             ::= DONE
 *
 * Transition Conditions:
 *   PROCESS_ELEMENT → DONE         : when elementKeys is empty
 *   CHECK_NESTED    → BUILD_SIMPLE : when path.length === 1 && not association
 *   CHECK_NESTED    → BUILD_ASSOC  : when path.length === 1 && is association
 *   CHECK_NESTED    → BUILD_NESTED : when path.length > 1 || has nested entries
 *   NEXT_ELEMENT    → DONE         : when no more elements
 *
 * Input/Output Examples:
 *   1. Simple field: { path: ['ID'] }
 *      → { sourceElement: 'ID' }
 *
 *   2. Association (expand all): { path: ['items'] } where items is Composition
 *      → { sourceElement: 'items', associatedInputElements: [] }
 *
 *   3. Nested path: { path: ['items', 'title'] }
 *      → { sourceElement: 'items', associatedInputElements: [{ sourceElement: 'title' }] }
 *
 *   4. With alias: { path: ['price'], alias: 'Amount' }
 *      → { sourceElement: 'price', targetVariable: 'Amount' }
 */

enum BuildState {
  GROUP_ENTRIES = 'GROUP_ENTRIES',
  PROCESS_ELEMENT = 'PROCESS_ELEMENT',
  CHECK_NESTED = 'CHECK_NESTED',
  BUILD_SIMPLE = 'BUILD_SIMPLE',
  BUILD_ASSOC = 'BUILD_ASSOC',
  BUILD_NESTED = 'BUILD_NESTED',
  NEXT_ELEMENT = 'NEXT_ELEMENT',
  DONE = 'DONE',
}

/**
 * Builds a tree structure from parsed input entries
 *
 * @param entries - Parsed input entries from parseInputsArray
 * @param rootEntity - The root entity to resolve elements from
 * @param resolver - Functions to resolve element information
 * @returns Tree of InputTreeNode representing the input structure
 */
export function buildInputTree<TEntity>(
  entries: ParsedInputEntry[],
  rootEntity: TEntity,
  resolver: ElementResolver<TEntity>,
): InputTreeNode[] {
  if (entries.length === 0) {
    return [];
  }

  const result: InputTreeNode[] = [];
  let state: BuildState = BuildState.GROUP_ENTRIES;

  const groups: Map<string, ParsedInputEntry[]> = new Map();
  let elementNames: string[] = [];
  let currentIndex: number = 0;
  let currentElementName: string = '';
  let currentGroup: ParsedInputEntry[] = [];
  let directAlias: string | undefined = undefined;
  let nestedEntries: ParsedInputEntry[] = [];

  while (state !== BuildState.DONE) {
    switch (state) {
      case BuildState.GROUP_ENTRIES: {
        for (const entry of entries) {
          const firstSegment = entry.path[0];
          if (!groups.has(firstSegment)) {
            groups.set(firstSegment, []);
          }
          groups.get(firstSegment)!.push(entry);
        }
        elementNames = Array.from(groups.keys());
        currentIndex = 0;
        state = BuildState.PROCESS_ELEMENT;
        break;
      }

      case BuildState.PROCESS_ELEMENT: {
        if (currentIndex >= elementNames.length) {
          state = BuildState.DONE;
          break;
        }
        currentElementName = elementNames[currentIndex];
        currentGroup = groups.get(currentElementName)!;

        const directEntry = currentGroup.find((e) => e.path.length === 1);

        directAlias = directEntry?.alias;
        nestedEntries = currentGroup
          .filter((e) => e.path.length > 1)
          .map((e) => ({ path: e.path.slice(1), alias: e.alias }));

        state = BuildState.CHECK_NESTED;
        break;
      }

      case BuildState.CHECK_NESTED: {
        const elements = resolver.getElements(rootEntity);
        const element = elements?.[currentElementName];
        const isAssocOrComp = element ? resolver.isAssocOrComp(element) : false;

        if (nestedEntries.length > 0) {
          state = BuildState.BUILD_NESTED;
        } else if (isAssocOrComp) {
          state = BuildState.BUILD_ASSOC;
        } else {
          state = BuildState.BUILD_SIMPLE;
        }
        break;
      }

      case BuildState.BUILD_SIMPLE: {
        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.BUILD_ASSOC: {
        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
          associatedInputElements: [],
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.BUILD_NESTED: {
        const elements = resolver.getElements(rootEntity);
        const element = elements?.[currentElementName];
        const targetEntity = element ? resolver.getTargetEntity(element, rootEntity) : rootEntity;
        const nestedResults = buildInputTree(nestedEntries, targetEntity, resolver);

        result.push({
          sourceElement: currentElementName,
          targetVariable: directAlias,
          associatedInputElements: nestedResults,
        });
        state = BuildState.NEXT_ELEMENT;
        break;
      }

      case BuildState.NEXT_ELEMENT: {
        currentIndex++;
        state = BuildState.PROCESS_ELEMENT;
        break;
      }
    }
  }

  return result;
}
