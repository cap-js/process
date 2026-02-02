import { Results, Target } from "@sap/cds"
import {
  coerceToString,
  concatenateBusinessKey,
  fetchMissingColumns,
  getElementAnnotations,
  isPredicateConditionMet,
} from "./handler"

import cds from "@sap/cds"

enum ProcessStartOn {
  Create = "CREATE",
  Update = "UPDATE",
  Delete = "DELETE",
}

type ProcessStartInput = {
  sourceElement: string
  targetVariable?: string
}

export type ProcessStartSpec = {
  id?: string
  on?: ProcessStartOn
  inputs: ProcessStartInput[]
  predicates: string[]
}

export async function handleProcessStart(
  target: Target,
  data: Results,
  req: cds.Request,
) {
  const startSpecs = initStartSpecs(target)

  // get all columns
  const row = await fetchMissingColumns(
    [...startSpecs.inputs.map((input) => input.sourceElement), ...startSpecs.predicates],
    data,
    req,
  )

  /// check start condition
  if (!isPredicateConditionMet(startSpecs.predicates, row)) {
    console.log(`Not starting process as start condition(s) are not met`)
    return
  }

  const processService = await cds.connect.to("ProcessService")

  await processService.emit("start", {
    definitionId: startSpecs.id!,
    context: buildContext(startSpecs, row, target),
  })

}

function initStartSpecs(target: Target): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: target['@build.process.start.id'] as string,
    on: target['@build.process.start.on'] as ProcessStartOn,
    inputs: [],
    predicates: [],
  }
  const elementAnnotations = getElementAnnotations(target as cds.entity)
  for (const [elementName, key, value] of elementAnnotations) {
    switch (key) {
      case "@build.process.input":
        const input: ProcessStartInput = { sourceElement: elementName }
        input.targetVariable = coerceToString(value)
        startSpecs.inputs.push(input)
        break

      case "@build.process.start.if":
        startSpecs.predicates.push(elementName)
        break
    }
  }
  return startSpecs
}

function buildContext(startSpecs: ProcessStartSpec, row: Results, target: Target): { [key: string]: string } {
    const businessKey = concatenateBusinessKey(target as cds.entity, row)
    const context = !startSpecs.inputs.length
    ? { ...row, businessKey: businessKey }
    : { ...buildPayload(startSpecs, row), businessKey: businessKey }

    return context;

}

function buildPayload(startSpecs: ProcessStartSpec, row: Results & { [key: string]: any }) {
  const payload: { [key: string]: unknown } = {}
  for (let input of startSpecs.inputs) {
    
    payload[input.targetVariable ?? input.sourceElement] = row?.[input.sourceElement];
  }
  return payload
}
