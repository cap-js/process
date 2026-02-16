import { column_expr, DeleteRequest, expr, Target } from "@sap/cds"
import {
  concatenateBusinessKey,
  fetchEntity,
  getElementAnnotations,
} from "./handler"
import { PROCESS_START_ID, PROCESS_START_ON, PROCESS_START_WHEN, PROCESS_INPUT, ERROR_CODES, LOG_MESSAGES, ERROR_MESSAGES } from "./constants"

import cds from "@sap/cds"
const LOG = cds.log("process");

type ProcessStartInput = {
  sourceElement: string
  targetVariable?: string
  associatedInputElements?: ProcessStartInput[]
}


export type ProcessStartSpec = {
  id?: string
  on?: string
  inputs: ProcessStartInput[]
  startExpr: expr | undefined
}

export function getColumnsForProcessStart(
  target: Target,
  req: cds.Request
): column_expr[] | string[] {
  const startSpecs = initStartSpecs(target, req)
  if(startSpecs.inputs.length === 0) {
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
    return ['*']
  } else {
    return convertToColumnsExpr(startSpecs.inputs);
  }
};

export async function handleProcessStart(
  req: cds.Request,
) {

  if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
    LOG.debug(LOG_MESSAGES.PROCESS_NOT_STARTED);
    return;
  }

  const target = req.target as Target;
  const data = (req as DeleteRequest)._Process ?? req.data

  const startSpecs = initStartSpecs(target, req)

  // if startSpecs.input = [] --> no input defined, fetch entire row
  let columns: column_expr[] | string[] = [];
  if(startSpecs.inputs.length === 0) {
    columns = ['*'];
    LOG.debug(LOG_MESSAGES.NO_PROCESS_INPUTS_DEFINED);
  } else {
    columns = convertToColumnsExpr(startSpecs.inputs);
  }


  // fetch entity new when event is not delete, otherwise use data object
  let row;
  try {
    row = req.event === 'DELETE' ? data : await fetchEntity(
      data,
      req,
      startSpecs.startExpr,
      columns
    );
  } catch (error) {
    LOG.error(ERROR_MESSAGES.PROCESS_START_FETCH_FAILED, error);
    return req.reject(500, ERROR_CODES.PROCESS_START_FETCH_FAILED);
  }

  if(!row) {
      LOG.debug(LOG_MESSAGES.PROCESS_NOT_STARTED);
      return
  }

  let businessKey;
  try {
    businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data});
  } catch (error) {
    LOG.error(ERROR_MESSAGES.PROCESS_START_INVALID_KEY, error);
    return req.reject(400, ERROR_CODES.PROCESS_START_INVALID_KEY);
  }

  const context = {...row, "businesskey": businessKey};

  try {
    const processService = await cds.connect.to("ProcessService")
    const outboxedService = cds.outboxed(processService);
    await outboxedService.emit("start", {
      definitionId: startSpecs.id!,
      context: context,
    })
  } catch (error) {
    LOG.error(ERROR_MESSAGES.PROCESS_START_FAILED + `${startSpecs.id}`, error);
    return req.reject(500, ERROR_CODES.PROCESS_START_FAILED);
  }

}

function initStartSpecs(target: Target, req: cds.Request): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: target[PROCESS_START_ID] as string,
    on: target[PROCESS_START_ON] as string,
    inputs: [],
    startExpr: target[PROCESS_START_WHEN] ? (target[PROCESS_START_WHEN]as any).xpr as expr : undefined,
  }
  const elementAnnotations = getElementAnnotations(target as cds.entity)
  const entityName = (target as cds.entity).name;
  startSpecs.inputs = getInputElements(elementAnnotations, new Set([entityName]), [entityName], req);
  
  return startSpecs
}

function getInputElements(
  elementAnnotations: [string, string, string, any][],
  visitedEntities: Set<string> = new Set(),
  currentPath: string[] = [],
  req: cds.Request
): ProcessStartInput[] {
  const inputs: ProcessStartInput[] = [];
  for (const [elementName, key, value, associatedElements] of elementAnnotations) {
    switch (key) {
      case PROCESS_INPUT:
        // For associations, recursively get input elements from the associated entity
        // If the associated entity has no annotated elements, use empty array to signal "expand all"
        let associatedInputElements: ProcessStartInput[] | undefined = undefined;
        
        if (associatedElements) {
          const associatedEntityName = associatedElements.name || elementName;
          
          // Check for cycle: if we've already visited this entity, throw an error
          if (visitedEntities.has(associatedEntityName)) {
            LOG.error(ERROR_MESSAGES.PROCESS_START_CYCLE_DETECTED);
            return req.reject(400, ERROR_CODES.PROCESS_START_CYCLE_DETECTED);
          }
          
          // Add to visited set and path for this branch
          const newVisited = new Set(visitedEntities);
          newVisited.add(associatedEntityName);
          const newPath = [...currentPath, associatedEntityName];
          
          associatedInputElements = getInputElements(
            getElementAnnotations(associatedElements),
            newVisited,
            newPath,
            req
          );
        }
        
        const input: ProcessStartInput = { 
          sourceElement: elementName, 
          associatedInputElements 
        }

        if(typeof value === 'boolean' || (value === 'true' || value === 'false')) {
          input.targetVariable = undefined;
        } else {
          input.targetVariable = value;
        }

        inputs.push(input)  
        break

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