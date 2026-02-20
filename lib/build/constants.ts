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

export const WARNING_UNKNOWN_ANNOTATION = (entityName: string, key: string, allowedAnnotations: string[]): string =>
  cds.i18n.messages.at(MSG_KEY.WARNING_UNKNOWN_ANNOTATION, [entityName, key, allowedAnnotations.join(', ')])!;

export const ERROR_ANNOTATION_MUST_BE_STRING = (entityName: string, annotationOn: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_MUST_BE_STRING, [entityName, annotationOn])!;

export const ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION = (entityName: string, annotationOn: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION, [entityName, annotationOn])!;

export const ERROR_IF_MUST_BE_EXPRESSION = (entityName: string, annotationIf: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_IF_MUST_BE_EXPRESSION, [entityName, annotationIf])!;

// =============================================================================
// Start Annotation Validation Messages
// =============================================================================

export const ERROR_START_ON_REQUIRES_ID = (entityName: string, annotationOn: string, annotationId: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_START_ON_REQUIRES_ID, [entityName, annotationOn, annotationId])!;

export const ERROR_START_ID_REQUIRES_ON = (entityName: string, annotationId: string, annotationOn: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_START_ID_REQUIRES_ON, [entityName, annotationId, annotationOn])!;

export const ERROR_START_ID_MUST_BE_STRING = (entityName: string, annotationId: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_START_ID_MUST_BE_STRING, [entityName, annotationId])!;

export const WARNING_NO_PROCESS_DEFINITION = (entityName: string, annotationId: string, processId: string): string =>
  cds.i18n.messages.at(MSG_KEY.WARNING_NO_PROCESS_DEFINITION, [entityName, annotationId, processId])!;

// =============================================================================
// Generic Lifecycle Annotation Validation Messages
// =============================================================================

export const ERROR_ANNOTATION_REQUIRES_OTHER = (entityName: string, annotation: string, requiredAnnotation: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_ANNOTATION_REQUIRES_OTHER, [entityName, annotation, requiredAnnotation])!;

export const ERROR_CASCADE_MUST_BE_BOOLEAN = (entityName: string, annotationCascade: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_CASCADE_MUST_BE_BOOLEAN, [entityName, annotationCascade])!;

// =============================================================================
// Input Validation Messages
// =============================================================================

export const ERROR_START_BUSINESSKEY_INPUT_MISSING = (entityName: string, processDefId: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_START_BUSINESSKEY_INPUT_MISSING, [entityName, processDefId])!;

export const ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF = (entityName: string, attributeKey: string, processDefId: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF, [entityName, attributeKey, processDefId])!;

export const WARNING_TYPE_MISMATCH = (entityName: string, key: string, entityType: string | undefined, processType: string | undefined): string =>
  cds.i18n.messages.at(MSG_KEY.WARNING_TYPE_MISMATCH, [entityName, key, entityType, processType])!;

export const WARNING_ARRAY_MISMATCH = (entityName: string, key: string, entityIsArray: boolean, processIsArray: boolean): string => {
  const entityText = entityIsArray ? 'an array' : 'not an array';
  const processText = processIsArray ? 'an array' : 'a single value';
  return cds.i18n.messages.at(MSG_KEY.WARNING_ARRAY_MISMATCH, [entityName, key, entityText, processText])!;
};

export const ERROR_MISSING_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_MISSING_PROCESS_INPUT, [entityName, processDefId, inputKey])!;

export const WARNING_MANDATORY_MISMATCH = (entityName: string, key: string, processDefId: string): string =>
  cds.i18n.messages.at(MSG_KEY.WARNING_MANDATORY_MISMATCH, [entityName, key, processDefId])!;

export const ERROR_MISSING_MANDATORY_PROCESS_INPUT = (entityName: string, processDefId: string, inputKey: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_MISSING_MANDATORY_PROCESS_INPUT, [entityName, inputKey, processDefId])!;

// =============================================================================
// Association Validation Messages
// =============================================================================

export const ERROR_CYCLE_DETECTED = (target: string): string =>
  cds.i18n.messages.at(MSG_KEY.ERROR_CYCLE_DETECTED, [target])!;

// =============================================================================
// Misc Build Warnings
// =============================================================================

export const WARNING_INPUTS_NOT_VALIDATED = (entityName: string, processDefId: string): string =>
  cds.i18n.messages.at(MSG_KEY.WARNING_INPUTS_NOT_VALIDATED, [entityName, processDefId])!;
