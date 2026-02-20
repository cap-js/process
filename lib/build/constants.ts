/**
 * Build validation message constants with i18n support.
 */

import cds from '@sap/cds';

/**
 * Message key constants for build validation i18n lookups
 */
export const MSG_KEY = {
  WARNING_UNKNOWN_ANNOTATION: 'BUILD_WARNING_UNKNOWN_ANNOTATION',
  ERROR_ANNOTATION_MUST_BE_STRING: 'BUILD_ERROR_ANNOTATION_MUST_BE_STRING',
  ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION: 'BUILD_ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION',
  ERROR_IF_MUST_BE_EXPRESSION: 'BUILD_ERROR_IF_MUST_BE_EXPRESSION',
  ERROR_START_ON_REQUIRES_ID: 'BUILD_ERROR_START_ON_REQUIRES_ID',
  ERROR_START_ID_REQUIRES_ON: 'BUILD_ERROR_START_ID_REQUIRES_ON',
  ERROR_START_ID_MUST_BE_STRING: 'BUILD_ERROR_START_ID_MUST_BE_STRING',
  WARNING_NO_PROCESS_DEFINITION: 'BUILD_WARNING_NO_PROCESS_DEFINITION',
  ERROR_ANNOTATION_REQUIRES_OTHER: 'BUILD_ERROR_ANNOTATION_REQUIRES_OTHER',
  ERROR_ON_REQUIRED: 'BUILD_ERROR_ON_REQUIRED',
  ERROR_CASCADE_MUST_BE_BOOLEAN: 'BUILD_ERROR_CASCADE_MUST_BE_BOOLEAN',
  ERROR_START_BUSINESSKEY_INPUT_MISSING: 'BUILD_ERROR_START_BUSINESSKEY_INPUT_MISSING',
  ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF: 'BUILD_ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF',
  WARNING_TYPE_MISMATCH: 'BUILD_WARNING_TYPE_MISMATCH',
  WARNING_ARRAY_MISMATCH: 'BUILD_WARNING_ARRAY_MISMATCH',
  ERROR_MISSING_PROCESS_INPUT: 'BUILD_ERROR_MISSING_PROCESS_INPUT',
  WARNING_MANDATORY_MISMATCH: 'BUILD_WARNING_MANDATORY_MISMATCH',
  ERROR_MISSING_MANDATORY_PROCESS_INPUT: 'BUILD_ERROR_MISSING_MANDATORY_PROCESS_INPUT',
  ERROR_CYCLE_DETECTED: 'BUILD_ERROR_CYCLE_DETECTED',
  WARNING_INPUTS_NOT_VALIDATED: 'BUILD_WARNING_INPUTS_NOT_VALIDATED',
} as const;

// =============================================================================
// Annotation Validation Messages
// =============================================================================

export const WARNING_UNKNOWN_ANNOTATION = (entityName: string, key: string, allowedAnnotations: string[]): string => {
  const fallback = `${entityName}: Unknown annotation '${key}'. Allowed annotations are: ${allowedAnnotations.join(', ')}`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_UNKNOWN_ANNOTATION, [entityName, key, allowedAnnotations.join(', ')]) ?? fallback;
};

export const ERROR_ANNOTATION_MUST_BE_STRING = (entityName: string, annotationOn: string): string => {
  const fallback = `${entityName}: ${annotationOn} must be a string representing a lifecycle event or action name`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_MUST_BE_STRING, [entityName, annotationOn]) ?? fallback;
};

export const ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION = (entityName: string, annotationOn: string): string => {
  const fallBack = `${entityName}: ${annotationOn} must be either a lifecycle event (CREATE, UPDATE, DELETE) or an action defined on the entity`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION, [entityName, annotationOn]) ?? fallBack;
}

export const ERROR_IF_MUST_BE_EXPRESSION = (entityName: string, annotationIf: string): string => {
  const fallback = `${entityName}: ${annotationIf} must be a valid expression`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_IF_MUST_BE_EXPRESSION, [entityName, annotationIf]) ?? fallback;
};

// =============================================================================
// Start Annotation Validation Messages
// =============================================================================

export const ERROR_START_ON_REQUIRES_ID = (entityName: string, annotationOn: string, annotationId: string): string => {
  const fallback = `${entityName}: ${annotationOn} requires ${annotationId}`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_START_ON_REQUIRES_ID, [entityName, annotationOn, annotationId]) ?? fallback;
};

export const ERROR_START_ID_REQUIRES_ON = (entityName: string, annotationId: string, annotationOn: string): string => {
  const fallback = `${entityName}: ${annotationId} requires ${annotationOn}`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_START_ID_REQUIRES_ON, [entityName, annotationId, annotationOn]) ?? fallback;
};

export const ERROR_START_ID_MUST_BE_STRING = (entityName: string, annotationId: string): string => {
  const fallback = `${entityName}: ${annotationId} must be a string`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_START_ID_MUST_BE_STRING, [entityName, annotationId]) ?? fallback;
};

export const WARNING_NO_PROCESS_DEFINITION = (entityName: string, annotationId: string, processId: string): string => {
  const fallback = `${entityName}: No process definition found for ${annotationId} '${processId}'. Process inputs cannot be validated!`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_NO_PROCESS_DEFINITION, [entityName, annotationId, processId]) ?? fallback;
};

// =============================================================================
// Generic Lifecycle Annotation Validation Messages
// =============================================================================

export const ERROR_ANNOTATION_REQUIRES_OTHER = (entityName: string, annotation: string, requiredAnnotation: string): string => {
  const fallback = `${entityName}: ${annotation} requires ${requiredAnnotation}`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_REQUIRES_OTHER, [entityName, annotation, requiredAnnotation]) ?? fallback;
};

export const ERROR_ON_REQUIRED = (entityName: string, annotationPrefix: string, annotationOn: string): string => {
  const fallback = `${entityName}: ${annotationPrefix} requires ${annotationOn} to be defined`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_ON_REQUIRED, [entityName, annotationPrefix, annotationOn]) ?? fallback;
};

export const ERROR_CASCADE_MUST_BE_BOOLEAN = (entityName: string, annotationCascade: string): string => {
  const fallback = `${entityName}: ${annotationCascade} must be a boolean`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_CASCADE_MUST_BE_BOOLEAN, [entityName, annotationCascade]) ?? fallback;
};

// =============================================================================
// Input Validation Messages
// =============================================================================

export const ERROR_START_BUSINESSKEY_INPUT_MISSING = (entityName: string, processDefId: string): string => {
  const fallback = `${entityName}: Process definition '${processDefId}' requires a 'businesskey' input but it is not provided`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_START_BUSINESSKEY_INPUT_MISSING, [entityName, processDefId]) ?? fallback;
};

export const ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF = (entityName: string, attributeKey: string, processDefId: string): string => {
  const fallback = `${entityName}: Entity attribute '${attributeKey}' is not defined in process definition '${processDefId}'`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF, [entityName, attributeKey, processDefId]) ?? fallback;
};

export const WARNING_TYPE_MISMATCH = (entityName: string, key: string, entityType: string | undefined, processType: string | undefined): string => {
  const fallback = `${entityName}: Type mismatch for '${key}': entity has '${entityType}' but process definition expects '${processType}'`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_TYPE_MISMATCH, [entityName, key, entityType, processType]) ?? fallback;
};

export const WARNING_ARRAY_MISMATCH = (entityName: string, key: string, entityIsArray: boolean, processIsArray: boolean): string => {
  const entityText = entityIsArray ? 'an array' : 'not an array';
  const processText = processIsArray ? 'an array' : 'a single value';
  const fallback = `${entityName}: Array mismatch for '${key}': entity is ${entityText} but process definition expects ${processText}`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_ARRAY_MISMATCH, [entityName, key, entityText, processText]) ?? fallback;
};

export const ERROR_MISSING_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string): string => {
  const fallback = `${entityName}: Process definition '${processDefId}' expects input '${inputKey}' but it is not provided by the entity`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_MISSING_PROCESS_INPUT, [entityName, processDefId, inputKey]) ?? fallback;
};

export const WARNING_MANDATORY_MISMATCH = (entityName: string, key: string, processDefId: string): string => {
  const fallback = `${entityName}: Input '${key}' is mandatory in process definition '${processDefId}' but not marked as @mandatory in the entity`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_MANDATORY_MISMATCH, [entityName, key, processDefId]) ?? fallback;
};

export const ERROR_MISSING_MANDATORY_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string): string => {
  const fallback = `${entityName}: Mandatory input '${inputKey}' from process definition '${processDefId}' is missing in the entity`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_MISSING_MANDATORY_PROCESS_INPUT, [entityName, inputKey, processDefId]) ?? fallback;
};

// =============================================================================
// Association Validation Messages
// =============================================================================

export const ERROR_CYCLE_DETECTED = (target: string): string => {
  const fallback = `Cycle detected in entity associations at '${target}'. This is not supported.`;
  return cds.i18n.messages.at(MSG_KEY.ERROR_CYCLE_DETECTED, [target]) ?? fallback;
};

// =============================================================================
// Misc Build Warnings
// =============================================================================

export const WARNING_INPUTS_NOT_VALIDATED = (entityName: string, processDefId: string): string => {
  const fallback = `Inputs for ${entityName} are not validated against process definition ${processDefId}`;
  return cds.i18n.messages.at(MSG_KEY.WARNING_INPUTS_NOT_VALIDATED, [entityName, processDefId]) ?? fallback;
};
