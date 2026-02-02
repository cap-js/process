import { Results, Target } from "@sap/cds";
import cds from "@sap/cds"
import { concatenateBusinessKey, fetchMissingColumns, getElementAnnotations, isPredicateConditionMet } from "./handler";

enum ProcessCancelOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessCancelSpec = {
    on?: ProcessCancelOn,
    cascade?: boolean,
    predicates: string[]
}


export async function handleProcessCancel(
    target: Target,
    data: Results,
    req: cds.Request
) {
    // init specification
    const cancelSpecs = initCancelSpecs(target);

    // fetch required columns
    const row = await fetchMissingColumns(
        cancelSpecs.predicates,
        data,
        req
    );

    // check cancel condition or if event is delete
    if(!isPredicateConditionMet(cancelSpecs.predicates, row) && req.event !== 'DELETE') {
        console.log(`Not cancelling process as cancel condition(s) are not met`)
        return
    }

    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, row)

    // cancel process
    const processService = await cds.connect.to("ProcessService")
    await processService.emit("cancel", {
        businessKey: businessKey,
        cascade: cancelSpecs.cascade
    })

}

function initCancelSpecs(target: Target): ProcessCancelSpec { 
    const cancelSpecs: ProcessCancelSpec = {
        on: target['@build.process.cancel.on'] as ProcessCancelOn,
        cascade: target['@build.process.cancel.cascade'],
        predicates: []
    }
    const elementAnnotations = getElementAnnotations(target as cds.entity)
    for (const [elementName, key, value] of elementAnnotations) {
        switch (key) {
            case "@build.process.cancel.if":
            cancelSpecs.predicates.push(elementName)
            break
        }
    }

    return cancelSpecs;
}