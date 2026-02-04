import { column_expr, DeleteRequest, expr, Results, Target } from "@sap/cds"
import {
  coerceToString,
  concatenateBusinessKey,
  fetchEntity,
  getElementAnnotations,
} from "./handler"

import cds from "@sap/cds"
const LOG = cds.log("process");
const processNotStartingMessage = "Not starting process as start condition(s) are not met";

enum ProcessStartOn {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
}

type ProcessStartInput = {
  sourceElement: string
  targetVariable?: string
  associatedInputElements?: ProcessStartInput[]
}


export type ProcessStartSpec = {
  id?: string
  on?: ProcessStartOn
  inputs: ProcessStartInput[]
  startExpr: expr | undefined
}

export async function getColumnsForProcessStart(
  target: Target
): Promise<column_expr[]> {
  const startSpecs = initStartSpecs(target)
  return convertToColumns(startSpecs.inputs)
};

// TODO: handle entities without input annotations, need to discuss whether that makes sense
export async function handleProcessStart(
  req: cds.Request,
) {

  if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
    LOG.debug(processNotStartingMessage);
    return;
  }

  const target = req.target as Target;
  const data = (req as DeleteRequest)._Process ?? req.data

  const startSpecs = initStartSpecs(target)

  // fetch entity new when event is not delete, otherwise use data object
  const row = req.event === 'DELETE' ? data : await fetchEntity(
    data,
    req,
    startSpecs.startExpr,
    convertToColumns(startSpecs.inputs)
  )

  if(!row) {
      LOG.debug(processNotStartingMessage);
      return
  }

  const context = {...row, businessKey: concatenateBusinessKey(target as cds.entity, {...row, ...req.data})};

  const processService = await cds.connect.to("ProcessService")

  await processService.emit("start", {
    definitionId: startSpecs.id!,
    context: context,
  })

}

function initStartSpecs(target: Target): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: target['@build.process.start.id'] as string,
    on: target['@build.process.start.on'] as ProcessStartOn,
    inputs: [],
    startExpr: target['@build.process.start.when'] ? (target['@build.process.start.when']as any).xpr as expr : undefined,
  }
  const elementAnnotations = getElementAnnotations(target as cds.entity)
  startSpecs.inputs = getInputElements(elementAnnotations);
  
  return startSpecs
}

function getInputElements(elementAnnotations: [string, string, string, any][]): ProcessStartInput[] {
  const inputs: ProcessStartInput[] = [];
  for (const [elementName, key, value, associatedElements] of elementAnnotations) {
    switch (key) {
      case "@build.process.input":
        const input: ProcessStartInput = { sourceElement: elementName, associatedInputElements: associatedElements ? getInputElements(getElementAnnotations(associatedElements)) : undefined }
        input.targetVariable = coerceToString(value)
        inputs.push(input)  
        break

    }
  }
  return inputs;
}

function buildContext(startSpecs: ProcessStartSpec, row: Results, target: Target): { [key: string]: string } {
    const businessKey = concatenateBusinessKey(target as cds.entity, row)
    const context = !startSpecs.inputs.length
    ? { ...row, businessKey: businessKey }
    : { ...buildPayload(startSpecs.inputs, row), businessKey: businessKey }

    return context;

}

function buildPayload(inputs: ProcessStartInput[], row: Results & { [key: string]: any }) {
  const payload: { [key: string]: unknown } = {}
  for (let input of inputs) {
    
    if(input.associatedInputElements && input.associatedInputElements.length > 0) {
      // check for many to many associations wg. array
      
      payload[input.targetVariable ?? input.sourceElement] = buildPayload(input.associatedInputElements, row[input.sourceElement]);
    } else {
      payload[input.targetVariable ?? input.sourceElement] = row[input.sourceElement];
    }
  }
  return payload
}

// TODO: need to handle cycles?
function convertToColumns(array: ProcessStartInput[]): column_expr[] {
  return array.map((item) => {
    const column: column_expr = {};

    // Start with the source element as a ref
    column.ref = [item.sourceElement];

    // Add alias if targetVariable exists
    if (item.targetVariable) {
      column.as = item.targetVariable;
    }

    // Handle nested associations (expand)
    if (item.associatedInputElements && item.associatedInputElements.length > 0) {
      column.expand = convertToColumns(item.associatedInputElements);
    }

    return column;
  });
}