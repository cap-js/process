import cds, { Results, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchMissingColumns, getElementAnnotations, isPredicateConditionMet } from "./handler";

enum ProcessSuspendOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessSuspendSpec = {
    on?: ProcessSuspendOn,
    cascade?: boolean,
    predicates: string[]
}

export async function handleProcessSuspend(target: Target, data: Results, req: cds.Request) {

    // init specification
    const suspendSpecs = initSuspendSpecs(target);

    // fetch required columns
    const row = await fetchMissingColumns(
        suspendSpecs.predicates,
        data,
        req
    );

    // check suspend condition or if event is delete
    if(!isPredicateConditionMet(suspendSpecs.predicates, row) && req.event !== 'DELETE') {
        console.log(`Not suspending process as suspend condition(s) are not met`)
        return
    }

    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, row);
    
    // suspend process
    const processService = await cds.connect.to("ProcessService");
    await processService.emit("suspend", {
        businessKey: businessKey,
        cascade: suspendSpecs.cascade
    });
}

function initSuspendSpecs(target: Target): ProcessSuspendSpec {
    const suspendSpecs: ProcessSuspendSpec = {
        on: target['@build.process.suspend.on'] as ProcessSuspendOn,
        cascade: target['@build.process.suspend.cascade'],
        predicates: []
    }

    const elementAnnotations = getElementAnnotations(target as cds.entity)
    for (const [elementName, key, value] of elementAnnotations) {
        switch (key) {
            case "@build.process.suspend.if":
            suspendSpecs.predicates.push(elementName)
            break
        }
    }
    
    return suspendSpecs; 
}