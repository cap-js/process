import cds from "@sap/cds"
import { CsnDefinition, CsnElement, CsnEntity } from "../../types/csn-extensions";
import { PROCESS_DEFINITION_ID, PROCESS_INPUT } from "../constants";
import { ProcessValidationPlugin } from "./build-plugin";
const Plugin = cds.build?.Plugin
const ERROR = Plugin?.ERROR

export function getProcessDefInputsAndTypes(
    processDef: CsnDefinition,
    allDefinitions: Record<string, CsnDefinition>,
    prefix: string = '',
    visited: Set<string> = new Set()
  ): Record<string, string | undefined> {
    const result: Record<string, string | undefined> = {};
    
    // Process definitions store inputs in 'elements'
    const elements = (processDef as any).elements;
    if (!elements) {
      return result;
    }

    for (const [name, element] of Object.entries(elements) as [string, any][]) {
      const keyName = prefix ? `${prefix}.${name}` : name;
      
      // Check if this is an array type (has items)
      // TODO: check whether .items is the way to go here
      // if (element.items) {
      if (element.type === undefined) {
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
                keyName,
                newVisited
              );
              Object.assign(result, nestedElements);
            }
          }

        } else if (itemType) {
          
          result[keyName] = itemType;
        }
      }
      // Check if this is a complex type (non-cds type without items)
      else if (element.type && !element.type.startsWith('cds.')) {
        if (!visited.has(element.type)) {
          const newVisited = new Set(visited);
          newVisited.add(element.type);
          
          const typeDef = allDefinitions[element.type];
          if (typeDef && (typeDef as any).elements) {
            const nestedElements = getProcessDefInputsAndTypes(
              typeDef,
              allDefinitions,
              keyName,
              newVisited
            );
            Object.assign(result, nestedElements);
          } else {
            // Type not found or has no elements, use the type reference
            result[keyName] = element.type;
          }
        }
      }
      // Primitive CDS type
      else if (element.type) {
        result[keyName] = element.type;
      }
    }

    return result;
}

export function getElementNamesAndTypes(
    buildPlugin: ProcessValidationPlugin,
    def: CsnEntity,
    allDefinitions: Record<string, CsnDefinition>,
    visited: Set<string> = new Set()
  ): Record<string, string | undefined> {

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
    
    const result: Record<string, string | undefined> = {};
    
    for (const [name, element] of filteredEntries) {
      const isAssociationOrComposition = 
        element.type === 'cds.Association' || element.type === 'cds.Composition';
      
      // use annotation value or element name depending on if it is present
      const inputAnnotation = element[PROCESS_INPUT];
      const keyName = typeof inputAnnotation === 'string' ? inputAnnotation : name;
      
      if (isAssociationOrComposition) {
        Object.assign(result, getRecursiveElementNamesAndTypes(buildPlugin,hasInputAnnotation, element, keyName, allDefinitions, visited));

      } else {
        result[keyName] = element.type;
      }
    }
    
    return result;
}

function getRecursiveElementNamesAndTypes(buildPlugin: ProcessValidationPlugin, hasInputAnnotation: boolean, element: CsnElement, keyName: string, allDefinitions: Record<string, CsnDefinition>, visited: Set<string>): Record<string, string | undefined> {
    
    const result : Record<string, string | undefined> = {};
    
      //when no annotation is present, do not include elements
      if (!hasInputAnnotation || !element.target) {
        return {};
      }
      
      // prohibit cycles
      if (visited.has(element.target)) {
        buildPlugin.pushMessage(
          `Cycle detected in entity associations at '${element.target}'. This is not supported.`,
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
          result[`${keyName}.${assocName}`] = assocType;
        }
      }
      return result;
}

export function getProcessDefinitions(allDefinitions: Record<string, CsnDefinition> | undefined): Map<string, CsnDefinition> {
    const Ids: Map<string, CsnDefinition> = new Map();
    
    for (const [name, def] of Object.entries(allDefinitions || {})) {
      if(def[PROCESS_DEFINITION_ID]) {
        Ids.set(def[PROCESS_DEFINITION_ID], def);
      }
    }
    return Ids;
  }