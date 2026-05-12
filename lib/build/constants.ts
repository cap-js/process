/**
 * Build validation message constants.
 */

// =============================================================================
// Annotation Validation Messages
// =============================================================================

export const WARNING_UNKNOWN_ANNOTATION = (
  entityName: string,
  key: string,
  allowedAnnotations: string[],
): string => {
  return `${entityName}: Unknown annotation '${key}'. Allowed annotations are: ${allowedAnnotations.join(', ')}`;
};

export const ERROR_ANNOTATION_MUST_BE_STRING = (
  entityName: string,
  annotationOn: string,
): string => {
  return `${entityName}: ${annotationOn} must be a string representing a lifecycle event or action name`;
};

export const ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION = (
  entityName: string,
  annotationOn: string,
): string => {
  return `${entityName}: ${annotationOn} must be either a lifecycle event (CREATE, UPDATE, DELETE) or an action defined on the entity`;
};

export const ERROR_IF_MUST_BE_EXPRESSION = (entityName: string, annotationIf: string): string => {
  return `${entityName}: ${annotationIf} must be a valid expression`;
};

export const ERROR_BUSINESS_KEY_MUST_BE_EXPRESSION = (
  entityName: string,
  annotationBKey: string,
): string => {
  return `${entityName}: ${annotationBKey} must be a valid expression`;
};

export const WARNING_BUSINESS_KEY_MUST_BE_EXPRESSION = (
  entityName: string,
  annotationBKey: string,
): string => {
  return `${entityName}: ${annotationBKey} must be a valid expression. Length check will be skipped.`;
};

// =============================================================================
// Start Annotation Validation Messages
// =============================================================================

export const ERROR_START_ON_REQUIRES_ID = (
  entityName: string,
  annotationOn: string,
  annotationId: string,
): string => {
  return `${entityName}: ${annotationOn} requires ${annotationId}`;
};

export const ERROR_START_ID_REQUIRES_ON = (
  entityName: string,
  annotationId: string,
  annotationOn: string,
): string => {
  return `${entityName}: ${annotationId} requires ${annotationOn}`;
};

export const ERROR_START_ID_MUST_BE_STRING = (entityName: string, annotationId: string): string => {
  return `${entityName}: ${annotationId} must be a string`;
};

export const WARNING_NO_PROCESS_DEFINITION = (
  entityName: string,
  annotationId: string,
  processId: string,
): string => {
  return `${entityName}: No process definition found for ${annotationId} '${processId}'. Process inputs cannot be validated!`;
};

// =============================================================================
// Generic Lifecycle Annotation Validation Messages
// =============================================================================

export const ERROR_ANNOTATION_REQUIRES_OTHER = (
  entityName: string,
  annotation: string,
  requiredAnnotation: string,
): string => {
  return `${entityName}: ${annotation} requires ${requiredAnnotation}`;
};

export const ERROR_ON_REQUIRED = (
  entityName: string,
  annotationPrefix: string,
  annotationOn: string,
): string => {
  return `${entityName}: ${annotationPrefix} requires ${annotationOn} to be defined`;
};

export const ERROR_BUSINESS_KEY_REQUIRED = (entityName: string, annotationPrefix: string) =>
  `Entity "${entityName}" must have a business key defined when using the "${annotationPrefix}" annotation.`;

export const ERROR_CASCADE_MUST_BE_BOOLEAN = (
  entityName: string,
  annotationCascade: string,
): string => {
  return `${entityName}: ${annotationCascade} must be a boolean`;
};

// =============================================================================
// Input Validation Messages
// =============================================================================

export const WARNING_ATTRIBUTE_NOT_IN_PROCESS_DEF = (
  entityName: string,
  attributeKey: string,
  processDefId: string,
): string => {
  return `${entityName}: Entity attribute '${attributeKey}' is not defined in process definition '${processDefId}'`;
};

export const WARNING_TYPE_MISMATCH = (
  entityName: string,
  key: string,
  entityType: string | undefined,
  processType: string | undefined,
): string => {
  return `${entityName}: Type mismatch for '${key}': entity has '${entityType}' but process definition expects '${processType}'`;
};

export const WARNING_ARRAY_MISMATCH = (
  entityName: string,
  key: string,
  entityIsArray: boolean,
  processIsArray: boolean,
): string => {
  const entityText = entityIsArray ? 'an array' : 'not an array';
  const processText = processIsArray ? 'an array' : 'a single value';
  return `${entityName}: Array mismatch for '${key}': entity is ${entityText} but process definition expects ${processText}`;
};

export const ERROR_MISSING_PROCESS_INPUT = (
  entityName: string,
  processDefId: string,
  inputKey: string,
): string => {
  return `${entityName}: Process definition '${processDefId}' expects input '${inputKey}' but it is not provided by the entity`;
};

export const WARNING_MANDATORY_MISMATCH = (
  entityName: string,
  key: string,
  processDefId: string,
): string => {
  return `${entityName}: Input '${key}' is mandatory in process definition '${processDefId}' but not marked as @mandatory in the entity`;
};

export const ERROR_MISSING_MANDATORY_PROCESS_INPUT = (
  entityName: string,
  processDefId: string,
  inputKey: string,
): string => {
  return `${entityName}: Mandatory input '${inputKey}' from process definition '${processDefId}' is missing in the entity`;
};

export const WARNING_INPUT_PATH_NOT_IN_ENTITY = (entityName: string, inputPath: string): string => {
  return `${entityName}: Input path '${inputPath}' does not exist on the entity. If this is a virtual field added at runtime, you can ignore this warning.`;
};

// =============================================================================
// Misc Build Warnings
// =============================================================================

export const WARNING_INPUTS_NOT_VALIDATED = (entityName: string, processDefId: string): string => {
  return `Inputs for ${entityName} are not validated against process definition ${processDefId}`;
};
