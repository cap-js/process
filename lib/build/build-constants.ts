/**
 * Error and warning message templates for build validation
 */

// Annotation validation warnings (soft failures - may or may not cause issues)
export const WARNING_UNKNOWN_ANNOTATION = (entityName: string, key: string, allowedAnnotations: string[]) =>
  `${entityName}: Unknown annotation '${key}'. Allowed annotations are: ${allowedAnnotations.join(', ')}`

export const ERROR_ANNOTATION_MUST_BE_STRING = (entityName: string, annotationOn: string) =>
  `${entityName}: ${annotationOn} must be a string representing a lifecycle event or action name`

export const ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION = (entityName: string, annotationOn: string) =>
  `${entityName}: ${annotationOn} must be either a lifecycle event (CREATE, UPDATE, DELETE) or an action defined on the entity`

export const ERROR_IF_MUST_BE_EXPRESSION = (entityName: string, annotationIf: string) =>
  `${entityName}: ${annotationIf} must be a valid expression`

// Start annotation errors
export const ERROR_START_ON_REQUIRES_ID = (entityName: string, annotationOn: string, annotationId: string) =>
  `${entityName}: ${annotationOn} requires ${annotationId}`

export const ERROR_START_ID_REQUIRES_ON = (entityName: string, annotationId: string, annotationOn: string) =>
  `${entityName}: ${annotationId} requires ${annotationOn}`

export const ERROR_START_ID_MUST_BE_STRING = (entityName: string, annotationId: string) =>
  `${entityName}: ${annotationId} must be a string`

export const WARNING_NO_PROCESS_DEFINITION = (entityName: string, annotationId: string, processId: string) =>
  `${entityName}: No process definition found for ${annotationId} '${processId}'. Process inputs cannot be validated!`

// Generic lifecycle annotation errors (cancel, suspend, resume)
export const ERROR_ANNOTATION_REQUIRES_OTHER = (entityName: string, annotation: string, requiredAnnotation: string) =>
  `${entityName}: ${annotation} requires ${requiredAnnotation}`

export const ERROR_CASCADE_MUST_BE_BOOLEAN = (entityName: string, annotationCascade: string) =>
  `${entityName}: ${annotationCascade} must be a boolean`

// Input validation errors
export const ERROR_START_BUSINESSKEY_INPUT_MISSING = (entityName: string, processDefId: string) =>
  `${entityName}: Process definition '${processDefId}' requires a 'businesskey' input but it is not provided`

export const ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF = (entityName: string, attributeKey: string, processDefId: string) =>
  `${entityName}: Entity attribute '${attributeKey}' is not defined in process definition '${processDefId}'`

export const WARNING_TYPE_MISMATCH = (entityName: string, key: string, entityType: string | undefined, processType: string | undefined) =>
  `${entityName}: Type mismatch for '${key}': entity has '${entityType}' but process definition expects '${processType}'`

export const WARNING_ARRAY_MISMATCH = (entityName: string, key: string, entityIsArray: boolean, processIsArray: boolean) =>
  `${entityName}: Array mismatch for '${key}': entity is ${entityIsArray ? 'an array' : 'not an array'} but process definition expects ${processIsArray ? 'an array' : 'a single value'}`

export const ERROR_MISSING_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string) =>
  `${entityName}: Process definition '${processDefId}' expects input '${inputKey}' but it is not provided by the entity`

// Association validation errors
export const ERROR_CYCLE_DETECTED = (target: string) =>
  `Cycle detected in entity associations at '${target}'. This is not supported.`

export const WARNING_MANDATORY_MISMATCH = (entityName: string, key: string, processDefId: string) =>
  `${entityName}: Input '${key}' is mandatory in process definition '${processDefId}' but not marked as @mandatory in the entity`

export const ERROR_MISSING_MANDATORY_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string) =>
  `${entityName}: Mandatory input '${inputKey}' from process definition '${processDefId}' is missing in the entity`

// Warning messages
export const WARNING_INPUTS_NOT_VALIDATED = (entityName: string, processDefId: string) =>
  `Inputs for ${entityName} are not validated against process definition ${processDefId}`
