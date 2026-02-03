import cds, { expr, Results, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchMissingColumns, getElementAnnotations, isPredicateConditionMet } from "./handler";


enum ProcessResumeOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessResumeSpec = {
    on?: ProcessResumeOn,
    cascade?: boolean,
    predicates: string[],
}


export async function handleProcessResume(target: Target, data: Results, req: cds.Request) {
    
    // init specification
    const resumeSpecs = initResumeSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    const row = await fetchMissingColumns(
        resumeSpecs.predicates,
        data,
        req
    );

    // check resume condition or if event is delete
    if(!isPredicateConditionMet(resumeSpecs.predicates, row) && req.event !== 'DELETE') {
            console.log(`Not resuming process as resume condition(s) are not met`)
            return
        }
    
    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, row);

    // resume process
    const processService = await cds.connect.to("ProcessService");
    await processService.emit("resume", {
        businessKey: businessKey,
        cascade: resumeSpecs.cascade
    });
}

function initResumeSpecs(target: Target): ProcessResumeSpec {
    const resumeSpecs: ProcessResumeSpec = {
        on: target['@build.process.resume.on'] as ProcessResumeOn,
        cascade: target['@build.process.resume.cascade'],
        predicates: [],
    }
    const elementAnnotations = getElementAnnotations(target as cds.entity)
        for (const [elementName, key, value] of elementAnnotations) {
            switch (key) {
                case "@build.process.resume.if":
                resumeSpecs.predicates.push(elementName)
                break
            }
        }
    return resumeSpecs;
}