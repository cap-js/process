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
  PROCESS_CANCEL,
  PROCESS_SUSPEND,
  PROCESS_RESUME,
  PROCESS_START,
  PROCESS_PREFIX,
} from '../constants';

import { CsnDefinition, CsnEntity } from '../types/csn-extensions';
import { extractQualifier, getAnnotationPrefixes, resolveBusinessKeyAnnotation } from '../shared/annotations-helper';

/**
 * Base annotation prefixes for lifecycle annotations (cancel, suspend, resume).
 * Each is passed to getAnnotationPrefixes() to discover qualified variants.
 */
const LIFECYCLE_ANNOTATION_BASES = [PROCESS_CANCEL, PROCESS_SUSPEND, PROCESS_RESUME] as const;

const LOG = cds.log('process-build');

// cds.build is only available during build phase, not during serve/watch
const Plugin = cds.build?.Plugin;
const ERROR = Plugin?.ERROR;

// Base class - use Plugin if available, otherwise a dummy class
const BuildPluginBase = Plugin ?? class {};

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
    }
    for (const message of this.messages) {
      if (message.severity === ERROR) {
        throw new cds.build.BuildError(`Process annotation validation failed.`);
      }
    }

    LOG.debug('All process annotations validated successfully.');
  }

  private validateStartAnnotations(
    entityName: string,
    def: CsnEntity,
    processDefinitions: Map<string, CsnDefinition>,
    allDefinitions: Record<string, CsnDefinition>,
  ) {
    const startPrefixes = Array.from(getAnnotationPrefixes(def, PROCESS_START));

    for (const prefix of startPrefixes) {
      const annotationId = `${prefix}.id` as `@${string}`;
      const annotationOn = `${prefix}.on` as `@${string}`;
      const annotationIf = `${prefix}.if` as `@${string}`;
      const annotationInputs = `${prefix}.inputs` as `@${string}`;

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
    const prefixes = Array.from(getAnnotationPrefixes(def, annotationBase));

    for (const prefix of prefixes) {
      const annotationOn = `${prefix}.on` as `@${string}`;
      const annotationCascade = `${prefix}.cascade` as `@${string}`;
      const annotationIf = `${prefix}.if` as `@${string}`;

      // check for unknown annotations for this prefix
      const allowedAnnotations = [annotationOn, annotationCascade, annotationIf];
      validateAllowedAnnotations(allowedAnnotations, def, entityName, prefix, this);

      const hasOn = def[annotationOn] !== undefined;
      const hasCascade = def[annotationCascade] !== undefined;
      const hasIf = def[annotationIf] !== undefined;

      // Resolve business key with qualified fallback:
      // For qualified prefix like '@bpm.process.cancel#two', extract qualifier 'two'
      // and try '@bpm.process.businessKey#two' first, then fall back to '@bpm.process.businessKey'
      const qualifier = extractQualifier(prefix, annotationBase);
      const resolvedBusinessKeyAnnotation = resolveBusinessKeyAnnotation(def, qualifier);
      const hasBusinessKey = def[resolvedBusinessKeyAnnotation] !== undefined;

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
        validateBusinessKeyAnnotation(def, entityName, resolvedBusinessKeyAnnotation, this);
      }
    }
  }
}
