import { Target } from "@sap/cds"
import {
  coerceToString,
  concatenateBusinessKey,
  fetchMissingColumns,
  getElementAnnotations,
  getKeyFieldsForEntity,
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
  id: string,
  on: string,
  each: object[],
  req: cds.Request,
) {
  const startSpecs = initStartSpecs(target, id, on)

  // get all columns
  const row = await fetchMissingColumns(
    [...startSpecs.inputs.map((input) => input.sourceElement), ...startSpecs.predicates],
    each,
    req,
  )

  /// check start condition
  if (!isStartConditionMet(startSpecs.predicates, row)) {
    console.log(`Not starting process with ID ${row?.ID} as start condition(s) are not met`)
    return
  }

  // refactor
  const businessKey = concatenateBusinessKey(target as cds.entity, row)
  const context = !startSpecs.inputs.length
    ? { ...row, businessKey: businessKey }
    : { ...buildPayload(startSpecs, row), businessKey: businessKey }

  const processService = await cds.connect.to("ProcessService")

  await processService.emit("start", {
    definitionId: startSpecs.id!,
    context: context,
  })
}
function isStartConditionMet(predicates: string[], row: any): boolean {
  let start = true
  for (let predicate of predicates) {
    start = start && row?.[predicate]
  }
  return start
}

function initStartSpecs(target: Target, id: string, on: string): ProcessStartSpec {
  const startSpecs: ProcessStartSpec = {
    id: id,
    on: on as ProcessStartOn,
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

function buildPayload(startSpecs: ProcessStartSpec, row: any) {
  const payload: { [key: string]: unknown } = {}
  for (let input of startSpecs.inputs) {
    payload[input.targetVariable ?? input.sourceElement] = row?.[input.sourceElement]
  }
  return payload
}
