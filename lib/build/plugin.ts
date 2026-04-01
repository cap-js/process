import cds from '@sap/cds';
import {
  getProcessDefinitions,
  validateAllowedAnnotations,
  validateCascadeAnnotation,
  validateIdAnnotation,
  validateInputTypes,
  validateOnAnnotation,
  validateRequiredGenericAnnotations,
  validateRequiredStartAnnotations,
  validateIfAnnotation,
  validateBusinessKeyAnnotation,
} from './index';
import {
  PROCESS_START,
  PROCESS_CANCEL,
  PROCESS_RESUME,
  PROCESS_SUSPEND,
  PROCESS_PREFIX,
  SUFFIX_ID,
  SUFFIX_ON,
  SUFFIX_IF,
  SUFFIX_INPUTS,
  BUSINESS_KEY,
  SUFFIX_CASCADE,
} from '../constants';
import { CsnDefinition, CsnEntity } from '../types/csn-extensions';
import { getAnnotationPrefixes } from '../shared/annotations-helper';

const LOG = cds.log('process-build');

// cds.build is only available during build phase, not during serve/watch
const Plugin = cds.build?.Plugin;
const ERROR = Plugin?.ERROR;

// Base class - use Plugin if available, otherwise a dummy class
const BuildPluginBase = Plugin ?? class {};

const LIFECYCLE_ANNOTATION_BASES = [PROCESS_CANCEL, PROCESS_SUSPEND, PROCESS_RESUME] as const;

export class ProcessValidationPlugin extends BuildPluginBase {
  static taskDefaults = { src: '.' };

  static hasTask() {
    return true;
  }

  async build() {
    const model = await this.model();
    if (!model) return;

    LOG.debug(`Validating ${PROCESS_PREFIX}.* annotations...`);

    const processDefinitions = getProcessDefinitions(model.definitions);

    const definitions = model.definitions ?? {};
    for (const name in definitions) {
      if (Object.hasOwn(definitions, name)) {
        const def = definitions[name];
        if (def.kind !== 'entity') continue;

        // Validate lifecycle annotations (cancel, suspend, resume) using configuration
        for (const annotationBase of LIFECYCLE_ANNOTATION_BASES) {
          this.validateProcessLifecycleAnnotations(name, def as CsnEntity, annotationBase);
        }
        this.validateStartAnnotations(
          name,
          def as CsnEntity,
          processDefinitions,
          model.definitions || {},
        );
      }
      for (const message of this.messages) {
        if (message.severity === ERROR) {
          throw new cds.build.BuildError(`Process annotation validation failed.`);
        }
      }

      LOG.debug('All process annotations validated successfully.');
    }
  }
  private validateStartAnnotations(
    entityName: string,
    def: CsnEntity,
    processDefinitions: Map<string, CsnDefinition>,
    allDefinitions: Record<string, CsnDefinition>,
  ) {
    const startPrefixes = getAnnotationPrefixes(def, PROCESS_START);

    for (const prefix of startPrefixes) {
      const annotationId = `${prefix}${SUFFIX_ID}` as `@${string}`;
      const annotationOn = `${prefix}${SUFFIX_ON}` as `@${string}`;
      const annotationIf = `${prefix}${SUFFIX_IF}` as `@${string}`;
      const annotationInputs = `${prefix}${SUFFIX_INPUTS}` as `@${string}`;

      // check unknown annotations for this prefix
      const allowedAnnotations = [annotationId, annotationOn, annotationIf, annotationInputs];
      validateAllowedAnnotations(allowedAnnotations, def, entityName, prefix, this);

      const hasId = def[annotationId] !== undefined;
      const hasOn = def[annotationOn] !== undefined;
      const hasIf = def[annotationIf] !== undefined;

      // required fields
      validateRequiredStartAnnotations(hasOn, hasId, entityName, annotationOn, annotationId, this);

      const processDef = processDefinitions.get(def[annotationId]);

      if (hasId) {
        validateIdAnnotation(def, entityName, annotationId, processDef, this);
      }

      if (hasOn) {
        validateOnAnnotation(def, entityName, annotationOn, this);
      }

      if (hasIf) {
        validateIfAnnotation(def, entityName, annotationIf, this);
      }

      if (hasId && hasOn && processDef) {
        const processInputs = allDefinitions[`${processDef.name}.ProcessInputs`];
        if (typeof processInputs !== 'undefined') {
          validateInputTypes(
            this,
            entityName,
            def,
            processInputs,
            allDefinitions,
            annotationInputs,
            annotationId,
          );
        }
      }
    }
  }

  // generic handler for suspend/resume/cancel annotations --> have same structure
  private validateProcessLifecycleAnnotations(
    entityName: string,
    def: CsnEntity,
    annotationBase: string,
  ) {
    const prefixes = getAnnotationPrefixes(def, annotationBase);

    for (const prefix of prefixes) {
      const annotationOn = `${prefix}${SUFFIX_ON}` as `@${string}`;
      const annotationCascade = `${prefix}${SUFFIX_CASCADE}` as `@${string}`;
      const annotationIf = `${prefix}${SUFFIX_IF}` as `@${string}`;

      // check for unknown annotations for this prefix
      const allowedAnnotations = [annotationOn, annotationCascade, annotationIf];
      validateAllowedAnnotations(allowedAnnotations, def, entityName, prefix, this);

      const hasOn = def[annotationOn] !== undefined;
      const hasCascade = def[annotationCascade] !== undefined;
      const hasIf = def[annotationIf] !== undefined;
      const hasBusinessKey = def[BUSINESS_KEY] !== undefined;

      const hasAnyAnnotationWithPrefix = Object.keys(def).some((key) =>
        key.startsWith(prefix + '.'),
      );

      // required fields - .on is required if any annotation with this prefix is defined
      validateRequiredGenericAnnotations(
        hasOn,
        hasAnyAnnotationWithPrefix,
        entityName,
        annotationOn,
        prefix,
        hasBusinessKey,
        this,
      );

      if (hasOn) {
        validateOnAnnotation(def, entityName, annotationOn, this);
      }

      if (hasCascade) {
        validateCascadeAnnotation(def, entityName, annotationCascade, this);
      }

      if (hasIf) {
        validateIfAnnotation(def, entityName, annotationIf, this);
      }

      if (hasOn && hasBusinessKey) {
        validateBusinessKeyAnnotation(def, entityName, this);
      }
    }
  }
}
