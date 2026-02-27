import cds from '@sap/cds';
import { ProcessValidationPlugin } from './plugin';
import { CsnDefinition, CsnEntity } from '../../types/csn-extensions';
import { PROCESS_START_ID, PROCESS_START_ON } from '../constants';
import {
  ElementType,
  getElementNamesAndTypes,
  getProcessDefInputsAndTypes,
} from './validation-utils';
import {
  WARNING_UNKNOWN_ANNOTATION,
  ERROR_ANNOTATION_MUST_BE_STRING,
  ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION,
  ERROR_IF_MUST_BE_EXPRESSION,
  ERROR_START_ON_REQUIRES_ID,
  ERROR_START_ID_REQUIRES_ON,
  ERROR_START_ID_MUST_BE_STRING,
  ERROR_ON_REQUIRED,
  WARNING_TYPE_MISMATCH,
  WARNING_ARRAY_MISMATCH,
  ERROR_MISSING_MANDATORY_PROCESS_INPUT,
  ERROR_CASCADE_MUST_BE_BOOLEAN,
  WARNING_MANDATORY_MISMATCH,
  ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF,
  WARNING_NO_PROCESS_DEFINITION,
  ERROR_START_BUSINESSKEY_INPUT_MISSING,
} from './constants';

const Plugin = cds.build?.Plugin;
const ERROR = Plugin?.ERROR;
const WARNING = Plugin?.WARNING;
const VALID_EVENTS = ['CREATE', 'READ', 'UPDATE', 'DELETE'] as const;

export function validateAllowedAnnotations(
  allowedAnnotations: string[],
  def: CsnEntity,
  entityName: string,
  annotationPrefix: string,
  buildPlugin: ProcessValidationPlugin,
) {
  for (const key of Object.keys(def)) {
    if (key.startsWith(annotationPrefix + '.') && !allowedAnnotations.includes(key)) {
      buildPlugin.pushMessage(
        WARNING_UNKNOWN_ANNOTATION(entityName, key, allowedAnnotations),
        WARNING,
      );
    }
  }
}

export function validateOnAnnotation(
  def: CsnEntity,
  entityName: string,
  annotationOn: string,
  buildPlugin: ProcessValidationPlugin,
) {
  if (typeof def[annotationOn as `@${string}`] !== 'string') {
    buildPlugin.pushMessage(ERROR_ANNOTATION_MUST_BE_STRING(entityName, annotationOn), ERROR);
  }

  const actions = def.actions ? Object.keys(def.actions) : [];
  const annotationValue = def[annotationOn as `@${string}`];
  if (!VALID_EVENTS.includes(annotationValue) && !actions.includes(annotationValue)) {
    buildPlugin.pushMessage(
      ERROR_ANNOTATION_MUST_BE_EVENT_OR_ACTION(entityName, annotationOn),
      ERROR,
    );
  }
}

export function validateIfAnnotation(
  def: CsnEntity,
  entityName: string,
  annotationIf: string,
  buildPlugin: ProcessValidationPlugin,
) {
  const ifExpr = def[annotationIf as `@${string}`];
  if (!ifExpr || !ifExpr['='] || !ifExpr['xpr']) {
    buildPlugin.pushMessage(ERROR_IF_MUST_BE_EXPRESSION(entityName, annotationIf), ERROR);
  }
}

export function validateCascadeAnnotation(
  def: CsnEntity,
  entityName: string,
  annotationCascade: string,
  buildPlugin: ProcessValidationPlugin,
) {
  if (typeof def[annotationCascade as `@${string}`] !== 'boolean') {
    buildPlugin.pushMessage(ERROR_CASCADE_MUST_BE_BOOLEAN(entityName, annotationCascade), ERROR);
  }
}

export function validateRequiredStartAnnotations(
  hasOn: boolean,
  hasId: boolean,
  entityName: string,
  buildPlugin: ProcessValidationPlugin,
) {
  if (hasOn && !hasId) {
    buildPlugin.pushMessage(
      ERROR_START_ON_REQUIRES_ID(entityName, PROCESS_START_ON, PROCESS_START_ID),
      ERROR,
    );
  }
  if (hasId && !hasOn) {
    buildPlugin.pushMessage(
      ERROR_START_ID_REQUIRES_ON(entityName, PROCESS_START_ID, PROCESS_START_ON),
      ERROR,
    );
  }
}

export function validateIdAnnotation(
  def: CsnEntity,
  entityName: string,
  processDef: CsnDefinition | undefined,
  buildPlugin: ProcessValidationPlugin,
) {
  if (typeof def[PROCESS_START_ID] !== 'string') {
    buildPlugin.pushMessage(ERROR_START_ID_MUST_BE_STRING(entityName, PROCESS_START_ID), ERROR);
  }

  if (!processDef) {
    buildPlugin.pushMessage(
      WARNING_NO_PROCESS_DEFINITION(entityName, PROCESS_START_ID, def[PROCESS_START_ID]),
      WARNING,
    );
  }
}
export function validateRequiredGenericAnnotations(
  hasOn: boolean,
  hasAnyAnnotationWithPrefix: boolean,
  entityName: string,
  annotationOn: string,
  annotationPrefix: string,
  buildPlugin: ProcessValidationPlugin,
) {
  // If any annotation with this prefix is defined, .on is required
  if (hasAnyAnnotationWithPrefix && !hasOn) {
    buildPlugin.pushMessage(ERROR_ON_REQUIRED(entityName, annotationPrefix, annotationOn), ERROR);
  }
}

export function validateInputTypes(
  buildPlugin: ProcessValidationPlugin,
  entityName: string,
  def: CsnDefinition,
  processDef: CsnDefinition,
  allDefinitions: Record<string, CsnDefinition> | undefined,
) {
  // entity attributes from annotations
  const entityAttributes = getElementNamesAndTypes(
    buildPlugin,
    def as CsnEntity,
    allDefinitions || {},
    new Set<string>(),
  );

  // process def inputs from csn model
  const processDefInputs = getProcessDefInputsAndTypes(processDef, allDefinitions || {});
  if (!processDefInputs['businesskey']) {
    buildPlugin.pushMessage(
      ERROR_START_BUSINESSKEY_INPUT_MISSING(entityName, def[PROCESS_START_ID]),
      ERROR,
    );
  } else {
    delete processDefInputs['businesskey'];
  }

  // Compare entity attributes against process definition inputs
  validateInputsMatch(
    buildPlugin,
    entityName,
    entityAttributes,
    processDefInputs,
    def[PROCESS_START_ID],
  );
}

function validateInputsMatch(
  buildPlugin: ProcessValidationPlugin,
  entityName: string,
  entityAttributes: Record<string, ElementType>,
  processDefInputs: Record<string, ElementType>,
  processDefId: string,
  prefix: string = '',
): void {
  const entityKeys = Object.keys(entityAttributes);
  const processKeys = Object.keys(processDefInputs);

  // Check for entity attributes that don't exist in process definition
  for (const key of entityKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (!(key in processDefInputs)) {
      buildPlugin.pushMessage(
        ERROR_ATTRIBUTE_NOT_IN_PROCESS_DEF(entityName, fullKey, processDefId),
        ERROR,
      );
    } else {
      // Check type compatibility
      const entityType = entityAttributes[key];
      const processType = processDefInputs[key];

      validateElementTypeMatch(
        buildPlugin,
        entityName,
        fullKey,
        entityType,
        processType,
        processDefId,
      );
    }
  }

  // Check for process inputs that are missing from entity attributes
  // Only mandatory process inputs are required to be present in the entity
  for (const key of processKeys) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const processInput = processDefInputs[key];

    if (!(key in entityAttributes)) {
      if (processInput.isMandatory) {
        buildPlugin.pushMessage(
          ERROR_MISSING_MANDATORY_PROCESS_INPUT(entityName, processDefId, fullKey),
          ERROR,
        );
      }
      // Optional inputs that are missing are fine - no error needed
    }
  }
}

/**
 * Validates that an entity element type matches the expected process definition input type.
 * Handles type comparison, array mismatch, mandatory flags, and nested properties recursively.
 */
function validateElementTypeMatch(
  buildPlugin: ProcessValidationPlugin,
  entityName: string,
  key: string,
  entityType: ElementType,
  processType: ElementType,
  processDefId: string,
): void {
  // Check if mandatory flag is compatible
  // Process input is mandatory but entity attribute is not
  if (processType.isMandatory && !entityType.isMandatory) {
    buildPlugin.pushMessage(WARNING_MANDATORY_MISMATCH(entityName, key, processDefId), WARNING);
  }

  // Check array mismatch
  const entityIsArray = entityType.isArray === true;
  const processIsArray = processType.isArray === true;
  if (entityIsArray !== processIsArray) {
    buildPlugin.pushMessage(
      WARNING_ARRAY_MISMATCH(entityName, key, entityIsArray, processIsArray),
      WARNING,
    );
  }

  // Check base type compatibility
  // For associations/compositions, we compare the target type or allow structural compatibility
  const entityBaseType = entityType.type;
  const processBaseType = processType.type;

  // Skip type mismatch check for association/composition types when comparing with complex types
  const isEntityAssociationOrComposition =
    entityBaseType === 'cds.Association' || entityBaseType === 'cds.Composition';

  if (!isEntityAssociationOrComposition && entityBaseType !== processBaseType) {
    buildPlugin.pushMessage(
      WARNING_TYPE_MISMATCH(entityName, key, entityBaseType, processBaseType),
      WARNING,
    );
  }

  // Recursively validate nested properties if both have them
  if (entityType.properties && processType.properties) {
    validateInputsMatch(
      buildPlugin,
      entityName,
      entityType.properties,
      processType.properties,
      processDefId,
      key,
    );
  }
}
