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
  const startSpecs = initStartSpecs(target, req);
  if (startSpecs.inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*'];
  } else {
    return convertToColumnsExpr(startSpecs.inputs);
  }
}

export async function handleProcessStart(req: cds.Request): Promise<void> {
  if (isDeleteWithoutProcess(req, LOG_MESSAGES.PROCESS_NOT_STARTED)) return;

  const target = req.target as Target;
  const data = ((req as ProcessDeleteRequest)._Process ??
    getEntityDataFromRequest(req)) as EntityRow;

  const startSpecs = initStartSpecs(target, req);

  // if startSpecs.input = [] --> no input defined, fetch entire row
  let columns: column_expr[] | string[] = [];
  if (startSpecs.inputs.length === 0) {
    columns = ['*'];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(startSpecs.inputs);
  }

  // fetch entity
  const row = await resolveEntityRowOrReject(
    req,
    data,
    startSpecs.conditionExpr,
    'PROCESS_START_FETCH_FAILED',
    LOG_MESSAGES.PROCESS_NOT_STARTED,
    columns,
  );
  if (!row) return;

  // get business key
  const businessKey = getBusinessKeyOrReject(
    target as cds.entity,
    row,
    req,
    'PROCESS_START_INVALID_KEY',
    'PROCESS_START_EMPTY_KEY',
  );
  if (!businessKey) return;

  const context = { ...row, businesskey: businessKey };

  // emit process start
  const payload = { definitionId: startSpecs.id!, context };
  await emitProcessEvent('start', req, payload, 'PROCESS_START_FAILED', startSpecs.id!);
}

function initStartSpecs(target: Target, req: cds.Request): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: target[PROCESS_START_ID] as string,
    on: target[PROCESS_START_ON] as string,
    inputs: [],
    conditionExpr: target[PROCESS_START_IF]
      ? ((target[PROCESS_START_IF] as unknown as { xpr: expr }).xpr as expr)
      : undefined,
  };
  const elementAnnotations = getElementAnnotations(target as cds.entity);
  const entityName = (target as cds.entity).name;
  startSpecs.inputs = getInputElements(
    elementAnnotations,
    new Set([entityName]),
    [entityName],
    req,
  );

  return startSpecs;
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
            LOG.error('PROCESS_START_CYCLE_DETECTED', associatedEntityName);
            return req.reject({
              status: 400,
              message: 'PROCESS_START_CYCLE_DETECTED',
              args: [associatedEntityName],
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
