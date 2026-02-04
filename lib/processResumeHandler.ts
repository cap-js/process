import cds, { DeleteRequest, expr, Results, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchEntity } from "./handler";
import { PROCESS_RESUME_ON, PROCESS_RESUME_CASCADE, PROCESS_RESUME_WHEN } from "./constants";


enum ProcessResumeOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessResumeSpec = {
    on?: ProcessResumeOn,
    cascade?: boolean,
    resumeExpr: expr | undefined
}

const LOG = cds.log("process");
const processNotResumedMessage = "Not resuming process as resume condition(s) are not met";


export async function handleProcessResume(req: cds.Request) {
    
    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(processNotResumedMessage);
        return;
    }

    const target = req.target as Target;
    const data = (req as DeleteRequest)._Process ?? req.data
    
    // init specification
    const resumeSpecs = initResumeSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    const row = req.event === 'DELETE' ? data : await fetchEntity(
        data,
        req,
        resumeSpecs.resumeExpr    
    );

    // check resume condition or if event is delete
    if(!row) {
        LOG.debug(processNotResumedMessage)
        return
    }
    
    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data});

    // resume process
    const processService = await cds.connect.to("ProcessService");
    await processService.emit("resume", {
        businessKey: businessKey,
        cascade: resumeSpecs.cascade
    });
}

function initResumeSpecs(target: Target): ProcessResumeSpec {
    const resumeSpecs: ProcessResumeSpec = {
        on: target[PROCESS_RESUME_ON] as ProcessResumeOn,
        cascade: target[PROCESS_RESUME_CASCADE],
        resumeExpr: target[PROCESS_RESUME_WHEN] ? (target[PROCESS_RESUME_WHEN]as any).xpr as expr : undefined,
    }
    return resumeSpecs;
}