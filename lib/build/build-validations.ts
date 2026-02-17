import cds from "@sap/cds"
import { ProcessValidationPlugin } from "./build-plugin";
import { CsnDefinition, CsnEntity } from "../../types/csn-extensions";
import { PROCESS_START_ID, PROCESS_START_ON } from "../constants";
import { getElementNamesAndTypes, getProcessDefInputsAndTypes } from "./build-validation-utils";
const Plugin = cds.build?.Plugin
const ERROR = Plugin?.ERROR
const VALID_EVENTS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const
const LOG = cds.log("process-build")

export function validateAllowedAnnotations(allowedAnnotations: string[], def: CsnDefinition, entityName: string, annotationPrefix: string, buildPlugin: ProcessValidationPlugin) {
    for (const key of Object.keys(def)) {
      if (key.startsWith(annotationPrefix + '.') && !allowedAnnotations.includes(key)) {
        buildPlugin.pushMessage(`${entityName}: Unknown annotation '${key}'. Allowed annotations are: ${allowedAnnotations.join(', ')}`, ERROR)
      }
    }
}

export function validateOnAnnotation(def: any, entityName: string, annotationOn: string, buildPlugin: ProcessValidationPlugin) {
    if (typeof def[annotationOn] !== 'string') {
        buildPlugin.pushMessage(`${entityName}: ${annotationOn} must be a string representing a lifecycle event or action name`, ERROR)
      }

      const actions = Object.keys((def as any).actions || {})
      if(!VALID_EVENTS.includes(def[annotationOn]) && !actions.includes(def[annotationOn])) {
        buildPlugin.pushMessage(`${entityName}: ${annotationOn} must be either a lifecycle event (CREATE, UPDATE, DELETE) or an action defined on the entity`, ERROR)
      }
  }

export function validateIfAnnotation(def: any, entityName: string, annotationIf: string, buildPlugin: ProcessValidationPlugin) {
    const ifExpr = def[annotationIf];
      
    if(ifExpr['='] && ifExpr['xpr']) {
      // should be valid --> TODO: further validations?
    } else {
      buildPlugin.pushMessage(`${entityName}: ${annotationIf} must be a valid expression`, ERROR)
    }
}

export function validateRequiredStartAnnotations(hasOn: boolean, hasId: boolean, def: any, entityName: string, processDef: CsnDefinition | undefined, buildPlugin: ProcessValidationPlugin) {
    if (hasOn && !hasId) {
        buildPlugin.pushMessage(`${entityName}: ${PROCESS_START_ON} requires ${PROCESS_START_ID}`, ERROR)
    }
    if (hasId && !hasOn) {
        buildPlugin.pushMessage(`${entityName}: ${PROCESS_START_ID} requires ${PROCESS_START_ON}`, ERROR)
    }

    if (hasId && typeof def[PROCESS_START_ID] !== 'string') {
        buildPlugin.pushMessage(`${entityName}: ${PROCESS_START_ID} must be a string`, ERROR)
    }

    
    if(hasId && !processDef) {
        buildPlugin.pushMessage(`${entityName}: No process definition found for ${PROCESS_START_ID} '${def[PROCESS_START_ID]}'`, ERROR)
    }
}

export function validateRequiredGenericAnnotations(hasOn: boolean, hasCascade: boolean, def: any, entityName: string, annotationOn: string, annotationCascade: string, buildPlugin: ProcessValidationPlugin) {
  if (hasOn && !hasCascade) {
      buildPlugin.pushMessage(`${entityName}: ${annotationOn} requires ${annotationCascade}`, ERROR)
    }
    if (hasCascade && !hasOn) {
      buildPlugin.pushMessage(`${entityName}: ${annotationCascade} requires ${annotationOn}`, ERROR)
    }
}

export function validateInputTypes(buildPlugin: ProcessValidationPlugin, entityName: string, def: CsnDefinition, processDef: CsnDefinition, allDefinitions: Record<string, CsnDefinition> | undefined) {
  // entity attributes from annotations  
  const entityAttributes = getElementNamesAndTypes(buildPlugin,def as CsnEntity, allDefinitions || {});
           
  // process def inputs from csn model
  const processDefInputs = getProcessDefInputsAndTypes(processDef, allDefinitions || {});
  delete processDefInputs['businesskey'];
  
  // Compare entity attributes against process definition inputs
  validateInputsMatch(buildPlugin, entityName, entityAttributes, processDefInputs, def[PROCESS_START_ID]);
}

function validateInputsMatch(
    buildPlugin: ProcessValidationPlugin,
    entityName: string,
    entityAttributes: Record<string, string | undefined>,
    processDefInputs: Record<string, string | undefined>,
    processDefId: string
  ): void {
    const entityKeys = Object.keys(entityAttributes);
    const processKeys = Object.keys(processDefInputs);

    // Check for entity attributes that don't exist in process definition
    for (const key of entityKeys) {
      if (!(key in processDefInputs)) {
        buildPlugin.pushMessage(
          `${entityName}: Entity attribute '${key}' is not defined in process definition '${processDefId}'`,
          ERROR
        );
      } else {
        // Check type compatibility
        const entityType = entityAttributes[key];
        const processType = processDefInputs[key];
        
        if (entityType !== processType) {
          buildPlugin.pushMessage(
            `${entityName}: Type mismatch for '${key}': entity has '${entityType}' but process definition expects '${processType}'`,
            ERROR
          );
        }
      }
    }

    // Check for process inputs that are missing from entity attributes
    for (const key of processKeys) {
      if (!(key in entityAttributes)) {
        buildPlugin.pushMessage(
          `${entityName}: Process definition '${processDefId}' expects input '${key}' but it is not provided by the entity`,
          ERROR
        );
      }
    }
  }