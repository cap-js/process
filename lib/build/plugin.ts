import cds from "@sap/cds"
import { getProcessDefinitions, validateAllowedAnnotations, validateCascadeAnnotation, validateIdAnnotation, validateInputTypes, validateOnAnnotation, validateRequiredGenericAnnotations, validateRequiredStartAnnotations, validateIfAnnotation } from "./index"
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_START_IF,
  PROCESS_CANCEL_ON,
  PROCESS_CANCEL_CASCADE,
  PROCESS_CANCEL_IF,
  PROCESS_SUSPEND_ON,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_SUSPEND_IF,
  PROCESS_RESUME_ON,
  PROCESS_RESUME_CASCADE,
  PROCESS_RESUME_IF,
  PROCESS_INPUT,
  PROCESS_CANCEL,
  PROCESS_SUSPEND,
  PROCESS_RESUME,
  PROCESS_START,
} from "../constants"
import { CsnDefinition } from "../../types/csn-extensions"

const LOG = cds.log("process-build")

// cds.build is only available during build phase, not during serve/watch
const Plugin = cds.build?.Plugin
const ERROR = Plugin?.ERROR

// Base class - use Plugin if available, otherwise a dummy class
const BuildPluginBase = Plugin ?? class {}

export class ProcessValidationPlugin extends BuildPluginBase {
  
  static taskDefaults = { src: '.' }

  static hasTask() {
    return true
  }


  async build() {
    const model = await this.model()
    if (!model) return

    LOG.info("Validating @build.process.* annotations...")

    const processDefinitions = getProcessDefinitions(model.definitions);

    for (const [name, def] of Object.entries(model.definitions || {})) {
      if ((def as any).kind !== 'entity') continue

      this.validateCancelAnnotations(name, def)
      this.validateResumeAnnotations(name, def)
      this.validateSuspendAnnotations(name, def)
      this.validateStartAnnotations(name, def, processDefinitions, model.definitions || {});

    }
    
    for(const message of this.messages) {
      if(message.severity === ERROR) {
        throw new cds.build.BuildError(`Process annotation validation failed.`)
      }
    }

    LOG.info("All process annotations validated successfully.")
  }

  private validateStartAnnotations(entityName: string, def: CsnDefinition, processDefinitions: Map<string, CsnDefinition>, allDefinitions: Record<string, CsnDefinition>) {

    // check unknown annotations
    const allowedAnnotations = [PROCESS_START_ID, PROCESS_START_ON, PROCESS_START_IF, PROCESS_INPUT]
    validateAllowedAnnotations(allowedAnnotations, def, entityName, PROCESS_START, this);

    const hasId = def[PROCESS_START_ID] !== undefined
    const hasOn = def[PROCESS_START_ON] !== undefined
    const hasIf = def[PROCESS_START_IF] !== undefined

    // required fields
    validateRequiredStartAnnotations(hasOn, hasId, entityName, this);
    
    const processDef = processDefinitions.get(def[PROCESS_START_ID]);
    
    if (hasId) {
      validateIdAnnotation(def, entityName, processDef, this);
    }
    
    if (hasOn) {
      validateOnAnnotation(def, entityName, PROCESS_START_ON, this);
    }

    if (hasIf) {
      validateIfAnnotation(def, entityName, PROCESS_START_IF, this);
    }
    
    if(hasId && hasOn && processDef) { 

      const processInputs = allDefinitions[`${processDef.name}.ProcessInputs`];
      if(typeof processInputs !== 'undefined') {
        validateInputTypes(this, entityName, def, processInputs, allDefinitions);
      }
    }
  }
  
  private validateCancelAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_CANCEL_ON,
      PROCESS_CANCEL_CASCADE,
      PROCESS_CANCEL_IF,
      PROCESS_CANCEL
    )
  }

  private validateSuspendAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_SUSPEND_ON,
      PROCESS_SUSPEND_CASCADE,
      PROCESS_SUSPEND_IF,
      PROCESS_SUSPEND
    )
  }

  private validateResumeAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_RESUME_ON,
      PROCESS_RESUME_CASCADE,
      PROCESS_RESUME_IF,
      PROCESS_RESUME
    )
  }


  // generic handler for suspend/resume/cancel annotations --> have same structure
  private validateProcessLifecycleAnnotations(
    entityName: string,
    def: CsnDefinition,
    annotationOn: `@${string}`,
    annotationCascade: `@${string}`,
    annotationIf: `@${string}`,
    annotationPrefix: string
  ) {
    
    
    // check for unknown annotations
    const allowedAnnotations = [annotationOn, annotationCascade, annotationIf]
    validateAllowedAnnotations(allowedAnnotations, def, entityName, annotationPrefix, this);

    const hasOn = def[annotationOn] !== undefined
    const hasCascade = def[annotationCascade] !== undefined
    const hasIf = def[annotationIf] !== undefined

    // required fields
    validateRequiredGenericAnnotations(hasOn, hasCascade, def, entityName, annotationOn, annotationCascade, this);

    if (hasOn) {
      validateOnAnnotation(def, entityName, annotationOn, this);
    }

    if (hasCascade) {
      validateCascadeAnnotation(def, entityName, annotationCascade, this);
    }

    if (hasIf) {
      validateIfAnnotation(def, entityName, annotationIf, this);
    }
  }
}