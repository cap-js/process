import cds from "@sap/cds"
import { CsnCardinality, CsnDefinition, CsnElement, CsnEntity } from "../../types/csn-extensions";
import { PROCESS_DEFINITION_ID, PROCESS_INPUT } from "../constants";
import { ProcessValidationPlugin } from "./plugin";
import { ERROR_CYCLE_DETECTED } from "./constants";
const Plugin = cds.build?.Plugin
const ERROR = Plugin?.ERROR

export type ElementType = {
  type: string,
  isMandatory?: boolean, 
  isArray?: boolean,
  properties?: Record<string, ElementType>
}

export function getProcessDefInputsAndTypes(
    processDef: CsnDefinition,
    allDefinitions: Record<string, CsnDefinition>,
    visited: Set<string> = new Set()
  ): Record<string, ElementType> {
    const result: Record<string, ElementType> = {};
    
    
    // Process definitions store inputs in 'elements'
    const elements = (processDef as any).elements;
    if (!elements) {
      return result;
    }

    for (const [name, element] of Object.entries(elements) as [string, any][]) {
      // Check if this is an inline array type (has items directly, no type property)
      // This handles the old format: items: { items: { type: "..." } }
      if (element.type === undefined && element.items) {
        const itemType = element.items.type;
        
        // If items have a complex type, resolve it
        if (itemType && !itemType.startsWith('cds.')) {
          if (!visited.has(itemType)) {
            const newVisited = new Set(visited);
            newVisited.add(itemType);
            
            const typeDef = allDefinitions[itemType];
            if (typeDef && (typeDef as any).elements) {
              const nestedElements = getProcessDefInputsAndTypes(
                typeDef,
                allDefinitions,
                newVisited
              );
              result[name] = { type: itemType, isMandatory: element.notNull ? element.notNull : false, isArray: true, properties: nestedElements };
            }
          }

        } else if (itemType) {
          result[name] = { type: itemType, isMandatory: element.notNull ? element.notNull : false, isArray: true };
        }
      }
      // Check if this is a complex type (non-cds type)
      else if (element.type && !element.type.startsWith('cds.')) {
        if (!visited.has(element.type)) {
          const newVisited = new Set(visited);
          newVisited.add(element.type);
          
          const typeDef = allDefinitions[element.type];
          if (typeDef) {
            // Check if this type is an array type (has items in the type definition)
            if ((typeDef as any).items) {
              const itemType = (typeDef as any).items.type;
              if (itemType && !itemType.startsWith('cds.')) {
                if (!visited.has(itemType)) {
                  const itemVisited = new Set(newVisited);
                  itemVisited.add(itemType);
                  
                  const itemTypeDef = allDefinitions[itemType];
                  if (itemTypeDef && (itemTypeDef as any).elements) {
                    const nestedElements = getProcessDefInputsAndTypes(
                      itemTypeDef,
                      allDefinitions,
                      itemVisited
                    );
                    result[name] = { type: itemType, isMandatory: element.notNull ?? false, isArray: true, properties: nestedElements };
                  } else {
                    result[name] = { type: itemType, isMandatory: element.notNull ?? false, isArray: true };
                  }
                }
              } else if (itemType) {
                // Primitive array type
                result[name] = { type: itemType, isMandatory: element.notNull ?? false, isArray: true };
              }
            }
            // Regular complex type with elements
            else if ((typeDef as any).elements) {
              const nestedElements = getProcessDefInputsAndTypes(
                typeDef,
                allDefinitions,
                newVisited
              );
              result[name] = { type: element.type, isMandatory: element.notNull ?? false, isArray: false, properties: nestedElements };
            } else {
              // Type found but has no elements (and is not an array type), use the type reference
              result[name] = { type: element.type, isMandatory: element.notNull ?? false };
            }
          } else {
            // Type not found in definitions, use the type reference
            result[name] = { type: element.type, isMandatory: element.notNull ?? false };
          }
        }
      }
      // Primitive CDS type
      else if (element.type) {
        result[name] = { type: element.type, isMandatory: element.notNull ?? false };
      }
    }

    return result;
}

export function getElementNamesAndTypes(
    buildPlugin: ProcessValidationPlugin,
    def: CsnEntity,
    allDefinitions: Record<string, CsnDefinition>,
    visited: Set<string>
  ): Record<string, ElementType> {

    const elements = def.elements;
    const elementEntries = Object.entries(elements);
    
    // check if at least one element has @build.process.input
    const hasInputAnnotation = elementEntries.some(
      ([, element]) => `${PROCESS_INPUT}` in element
    );
    
    // filter elements
    const filteredEntries = hasInputAnnotation
      ? elementEntries.filter(([, element]) => `${PROCESS_INPUT}` in element)
      : elementEntries;
    
    const result: Record<string, ElementType> = {};
    
    for (const [name, element] of filteredEntries) {
      const isAssociationOrComposition = 
        element.type === 'cds.Association' || element.type === 'cds.Composition';
      const isMandatory = element['@mandatory'] === true;
      // use annotation value or element name depending on if it is present
      const inputAnnotation = element[PROCESS_INPUT];
      const keyName = typeof inputAnnotation === 'string' ? inputAnnotation : name;
      
      if (isAssociationOrComposition) {
        const associatedProperties = getRecursiveElementNamesAndTypes(buildPlugin, hasInputAnnotation, element, keyName, allDefinitions, visited);
        result[keyName] = { type: element.type, isMandatory: isMandatory, isArray: element.cardinality?.max === '*', properties: associatedProperties }; // include association/composition itself as an input

      } else {
        result[keyName] = { type: element.type, isMandatory: isMandatory };
      }
    }
    
    return result;
}

function getRecursiveElementNamesAndTypes(buildPlugin: ProcessValidationPlugin, hasInputAnnotation: boolean, element: CsnElement, keyName: string, allDefinitions: Record<string, CsnDefinition>, visited: Set<string>): Record<string, ElementType> {
    
    const result : Record<string, ElementType> = {};
    
      //when no annotation is present, do not include elements
      if (!hasInputAnnotation || !element.target) {
        return {};
      }
      
      // prohibit cycles
      if (visited.has(element.target)) {
        buildPlugin.pushMessage(
          ERROR_CYCLE_DETECTED(element.target),
          ERROR
        );
        return {};
      }
      
      const targetDef = allDefinitions[element.target];
      if (targetDef && targetDef.kind === 'entity') {

        // Track visited entity to prevent cycles
        const newVisited = new Set(visited);
        newVisited.add(element.target);
        
        // Recursively get elements from associated entity
        const associatedElements = getElementNamesAndTypes(
          buildPlugin,
          targetDef as CsnEntity,
          allDefinitions,
          newVisited
        );
        
        // Add associated elements with prefixed name
        for (const [assocName, assocType] of Object.entries(associatedElements)) {
          result[assocName] = assocType;
        }
      }
      return result;
}

export function getProcessDefinitions(allDefinitions: Record<string, CsnDefinition> | undefined): Map<string, CsnDefinition> {
    const Ids: Map<string, CsnDefinition> = new Map();
    
    for (const [name, def] of Object.entries(allDefinitions || {})) {
      if(def['@build.process']) {
        def.name = name; 
        Ids.set(def['@build.process'], def);
      }
    }
    return Ids;
  }