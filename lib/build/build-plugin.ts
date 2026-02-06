import cds from "@sap/cds"
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_START_WHEN,
  PROCESS_CANCEL_ON,
  PROCESS_CANCEL_CASCADE,
  PROCESS_CANCEL_WHEN,
  PROCESS_SUSPEND_ON,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_SUSPEND_WHEN,
  PROCESS_RESUME_ON,
  PROCESS_RESUME_CASCADE,
  PROCESS_RESUME_WHEN,
  PROCESS_INPUT,
  PROCESS_CANCEL,
  PROCESS_SUSPEND,
  PROCESS_RESUME,
} from "../constants"
import { CsnDefinition } from "../../types/csn-extensions"
import { validateAllowedAnnotations, validateOnAnnotation, validateRequiredGenericAnnotations, validateRequiredStartAnnotations, validateWhenAnnotation } from "./build-validations"
import { getProcessDefinitions } from "./build-validation-utils"

const LOG = cds.log("process-build")

// cds.build is only available during build phase, not during serve/watch
const Plugin = cds.build?.Plugin
const ERROR = Plugin?.ERROR
const WARNING = Plugin?.WARNING


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
      this.validateStartAnnotations(name, def, processDefinitions, model.definitions);

    }
    
    for(const message of this.messages) {
      if(message.severity === ERROR) {
        throw new cds.build.BuildError(`Process annotation validation failed.`)
      }
    }

    LOG.info("All process annotations validated successfully.")
  }

  private validateStartAnnotations(entityName: string, def: CsnDefinition, processDefinitions: Map<string, CsnDefinition>, allDefinitions: Record<string, CsnDefinition> | undefined) {

    // check unknown annotations
    const allowedAnnotations = [PROCESS_START_ID, PROCESS_START_ON, PROCESS_START_WHEN, PROCESS_INPUT]
    validateAllowedAnnotations(allowedAnnotations, def, entityName, PROCESS_START_ID, this);

    const hasId = def[PROCESS_START_ID] !== undefined
    const hasOn = def[PROCESS_START_ON] !== undefined
    const hasWhen = def[PROCESS_START_WHEN] !== undefined

    // required fields
    const processDef = processDefinitions.get(def[PROCESS_START_ID]);
    validateRequiredStartAnnotations(hasOn, hasId, def, entityName, processDef, this);

    
    if (hasOn) {
      validateOnAnnotation(def, entityName, PROCESS_START_ON, this);
    }

    if (hasWhen) {
      validateWhenAnnotation(def, entityName, PROCESS_START_WHEN, this);
    }
    
    if(hasId && hasOn && processDef) { 
      // validate inputs
      // TODO: refactor code inside
      // currently disabled as validation logic needs refinement for array types
      // validateInputTypes(this, entityName, def, processDef, allDefinitions);
      this.pushMessage(`Inputs for ${entityName} are not validated against process definition ${def[PROCESS_START_ID]}`, WARNING)
      
    }
  }
  
  private validateCancelAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_CANCEL_ON,
      PROCESS_CANCEL_CASCADE,
      PROCESS_CANCEL_WHEN,
      PROCESS_CANCEL
    )
  }

  private validateSuspendAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_SUSPEND_ON,
      PROCESS_SUSPEND_CASCADE,
      PROCESS_SUSPEND_WHEN,
      PROCESS_SUSPEND
    )
  }

  private validateResumeAnnotations(entityName: string, def: CsnDefinition) {
    this.validateProcessLifecycleAnnotations(
      entityName,
      def,
      PROCESS_RESUME_ON,
      PROCESS_RESUME_CASCADE,
      PROCESS_RESUME_WHEN,
      PROCESS_RESUME
    )
  }


  // generic handler for suspend/resume/cancel annotations --> have same structure
  // TODO: type for def
  private validateProcessLifecycleAnnotations(
    entityName: string,
    def: any,
    annotationOn: string,
    annotationCascade: string,
    annotationWhen: string,
    annotationPrefix: string
  ) {
    
    
    // check for unknown annotations
    const allowedAnnotations = [annotationOn, annotationCascade, annotationWhen]
    validateAllowedAnnotations(allowedAnnotations, def, entityName, annotationPrefix, this);

    const hasOn = def[annotationOn] !== undefined
    const hasCascade = def[annotationCascade] !== undefined
    const hasWhen = def[annotationWhen] !== undefined

    // required fields
    validateRequiredGenericAnnotations(hasOn, hasCascade, def, entityName, annotationOn, annotationCascade, this);

    // check types here
    if (hasOn) {
      validateOnAnnotation(def, entityName, annotationOn, this);
    }


    if (hasCascade && typeof def[annotationCascade] !== 'boolean') {
      this.pushMessage(`${entityName}: ${annotationCascade} must be a boolean`, ERROR)
    }

    if (hasWhen) {
      validateWhenAnnotation(def, entityName, annotationWhen, this);
    }
  }
}