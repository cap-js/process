import { column_expr, expr, Target } from '@sap/cds';
import {
  ElementAnnotation,
  emitProcessEvent,
  EntityRow,
  getBusinessKeyOrReject,
  getElementAnnotations,
  getEntityDataFromRequest,
  isDeleteWithoutProcess,
  ProcessDeleteRequest,
  resolveEntityRowOrReject,
} from './utils';
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_START_IF,
  PROCESS_INPUT,
  LOG_MESSAGES,
  PROCESS_LOGGER_PREFIX,
  PROCESS_START_QUALIFIER_PREFIX,
  PROCESS_START_QUALIFIER_PATTERN,
} from './../constants';

import cds from '@sap/cds';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

type ProcessStartInput = {
  sourceElement: string;
  targetVariable?: string;
  associatedInputElements?: ProcessStartInput[];
};

export type ProcessStartSpec = {
  id?: string;
  on?: string;
  inputs: ProcessStartInput[];
  conditionExpr: expr | undefined;
};

export function getColumnsForProcessStart(
  target: Target,
  req: cds.Request,
): column_expr[] | string[] {
  const sharedInputs = getSharedInputs(target, req);
  if (sharedInputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*'];
  } else {
    return convertToColumnsExpr(sharedInputs);
  }
}

export async function handleProcessStart(req: cds.Request, data: EntityRow): Promise<void> {
  if (isDeleteWithoutProcess(req, LOG_MESSAGES.PROCESS_NOT_STARTED)) return;

  const target = req.target as Target;
  data = ((req as ProcessDeleteRequest)._Process ??
    getEntityDataFromRequest(data, req.params)) as EntityRow;

  const allStartSpecs = getAllStartSpecs(target, req);
  if (allStartSpecs.length === 0) {
    LOG.debug(LOG_MESSAGES.PROCESS_NOT_STARTED);
    return;
  }

  // @build.process.input annotations are element-level, shared across all start specs
  const sharedInputs = allStartSpecs[0].inputs;
  let columns: column_expr[] | string[] = [];
  if (sharedInputs.length === 0) {
    columns = ['*'];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(sharedInputs);
  }

  for (const startSpec of allStartSpecs) {
    // Skip specs that don't apply to the current event
    if (startSpec.on && startSpec.on !== req.event && startSpec.on !== '*') continue;

    // fetch entity (includes per-spec condition check for non-DELETE events)
    const row = await resolveEntityRowOrReject(
      req,
      data,
      startSpec.conditionExpr,
      'PROCESS_START_FETCH_FAILED',
      LOG_MESSAGES.PROCESS_NOT_STARTED,
      columns,
    );
    if (!row) continue; // condition not met for this spec — try the next one

    // get business key
    const businessKey = getBusinessKeyOrReject(
      target as cds.entity,
      row,
      req,
      'PROCESS_START_INVALID_KEY',
      'PROCESS_START_EMPTY_KEY',
    );
    if (!businessKey) return; // invalid key is fatal for all specs

    const context = { ...row, businesskey: businessKey };

    // emit process start for this spec
    const payload = { definitionId: startSpec.id!, context };
    await emitProcessEvent('start', req, payload, 'PROCESS_START_FAILED', startSpec.id!);
  }
}

/**
 * Returns all start specs for the target entity, including both non-qualified
 * (@build.process.start) and qualified (@build.process.start #qualifier) annotations.
 * Inputs (@build.process.input) are element-level and shared across all specs.
 */
function getAllStartSpecs(target: Target, req: cds.Request): ProcessStartSpec[] {
  const specs: ProcessStartSpec[] = [];
  const entityAnnotations = target as unknown as Record<string, unknown>;

  // Shared inputs — element-level annotations, same for all start specs
  const sharedInputs = getSharedInputs(target, req);

  // Non-qualified annotation: @build.process.start: { id, on, if }
  if (entityAnnotations[PROCESS_START_ON]) {
    specs.push({
      id: entityAnnotations[PROCESS_START_ID] as string,
      on: entityAnnotations[PROCESS_START_ON] as string,
      inputs: sharedInputs,
      conditionExpr: entityAnnotations[PROCESS_START_IF]
        ? ((entityAnnotations[PROCESS_START_IF] as unknown as { xpr: expr }).xpr as expr)
        : undefined,
    });
  }

  // Qualified annotations: @bpm.process.start #qualifier: { id, on, if }
  // CDS stores these as @bpm.process.start#qualifier.id, @bpm.process.start#qualifier.on, etc.
  for (const key of Object.keys(entityAnnotations)) {
    const match = key.match(PROCESS_START_QUALIFIER_PATTERN);
    if (match) {
      const qualifier = match[1];
      const prefix = `${PROCESS_START_QUALIFIER_PREFIX}${qualifier}`;
      specs.push({
        id: entityAnnotations[`${prefix}.id`] as string,
        on: entityAnnotations[key] as string,
        inputs: sharedInputs,
        conditionExpr: entityAnnotations[`${prefix}.if`]
          ? ((entityAnnotations[`${prefix}.if`] as unknown as { xpr: expr }).xpr as expr)
          : undefined,
      });
    }
  }

  return specs;
}

/**
 * Extracts shared process input elements from element-level @build.process.input annotations.
 * These are the same for all start specs on an entity.
 */
function getSharedInputs(target: Target, req: cds.Request): ProcessStartInput[] {
  const elementAnnotations = getElementAnnotations(target as cds.entity);
  const entityName = (target as cds.entity).name;
  return getInputElements(elementAnnotations, new Set([entityName]), [entityName], req);
}

function getInputElements(
  elementAnnotations: ElementAnnotation[],
  visitedEntities: Set<string> = new Set(),
  currentPath: string[] = [],
  req: cds.Request,
): ProcessStartInput[] {
  const inputs: ProcessStartInput[] = [];
  for (const {
    elementName,
    annotationKey,
    annotationValue,
    associatedTarget,
  } of elementAnnotations) {
    switch (annotationKey) {
      case PROCESS_INPUT: {
        // For associations, recursively get input elements from the associated entity
        // If the associated entity has no annotated elements, use empty array to signal "expand all"
        let associatedInputElements: ProcessStartInput[] | undefined = undefined;

        if (associatedTarget) {
          const associatedEntityName = associatedTarget.name || elementName;

          // Check for cycle: if we've already visited this entity, throw an error
          if (visitedEntities.has(associatedEntityName)) {
            LOG.error(`Cycle detected in @bpm.process.input annotations: ${associatedEntityName}`);
            return req.reject({
              status: 400,
              message: `Cycle detected in @bpm.process.input annotations: ${associatedEntityName}`,
            });
          }

          // Add to visited set and path for this branch
          const newVisited = new Set(visitedEntities);
          newVisited.add(associatedEntityName);
          const newPath = [...currentPath, associatedEntityName];

          associatedInputElements = getInputElements(
            getElementAnnotations(associatedTarget),
            newVisited,
            newPath,
            req,
          );
        }

        const input: ProcessStartInput = {
          sourceElement: elementName,
          associatedInputElements,
        };

        if (
          typeof annotationValue === 'boolean' ||
          annotationValue === 'true' ||
          annotationValue === 'false'
        ) {
          input.targetVariable = undefined;
        } else {
          input.targetVariable = annotationValue;
        }

        inputs.push(input);
        break;
      }
    }
  }
  return inputs;
}

// Cycles are detected in getInputElements, so no cycle handling needed here
function convertToColumnsExpr(array: ProcessStartInput[]): column_expr[] {
  return array.map((item) => {
    const column: column_expr = {};

    // Start with the source element as a ref
    column.ref = [item.sourceElement];

    // Add alias if targetVariable exists
    if (item.targetVariable) {
      column.as = item.targetVariable;
    }

    // Handle nested associations (expand)
    // If associatedInputElements is defined (i.e., this is an association):
    // - If it has elements, expand with those specific elements
    // - If it's empty (no annotated elements in associated entity), expand with '*' to get all direct attributes
    if (item.associatedInputElements !== undefined) {
      if (item.associatedInputElements.length > 0) {
        column.expand = convertToColumnsExpr(item.associatedInputElements);
      } else {
        // Association annotated as input but associated entity has no annotated elements
        // -> expand with '*' to include all direct attributes
        column.expand = ['*'] as unknown as column_expr[];
      }
    }

    return column;
  });
}
