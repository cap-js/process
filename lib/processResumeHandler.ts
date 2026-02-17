import cds, { DeleteRequest, expr, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchEntity } from "./handler";
import { PROCESS_RESUME_ON, PROCESS_RESUME_CASCADE, PROCESS_RESUME_IF, ERROR_CODES, LOG_MESSAGES, ERROR_MESSAGES } from "./constants";

type ProcessResumeSpec = {
    on?: string,
    cascade?: boolean,
    resumeExpr: expr | undefined
}

const LOG = cds.log("process");


export async function handleProcessResume(req: cds.Request) {
    
    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_RESUMED);
        return;
    }

    const target = req.target as Target;
    const data = (req as DeleteRequest)._Process ?? req.data
    
    // init specification
    const resumeSpecs = initResumeSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    let row;
    try {
        row = req.event === 'DELETE' ? data : await fetchEntity(
            data,
            req,
            resumeSpecs.resumeExpr    
        );
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_RESUME_FETCH_FAILED, error);
        return req.reject(500, ERROR_CODES.PROCESS_RESUME_FETCH_FAILED);
    }

    // check resume condition or if event is delete
    if(!row) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_RESUMED);
        return;
    }
    
    // get business Key
    let businessKey;
    try {
        businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data});
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_RESUME_INVALID_KEY, error);
        return req.reject(400, ERROR_CODES.PROCESS_RESUME_INVALID_KEY);
    }

    if(!businessKey) {
        return req.reject(400, ERROR_CODES.PROCESS_RESUME_EMPTY_KEY);
    }

    // resume process
    try {
        const processService = await cds.connect.to("ProcessService");
        const outboxedService = cds.outboxed(processService);
        await outboxedService.emit("resume", {
            businessKey: businessKey,
            cascade: resumeSpecs.cascade
        });
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_RESUME_FAILED + `${businessKey}`, error);
        return req.reject(500, ERROR_CODES.PROCESS_RESUME_FAILED);
    }
}

function initResumeSpecs(target: Target): ProcessResumeSpec {
    const resumeSpecs: ProcessResumeSpec = {
        on: target[PROCESS_RESUME_ON] as string,
        cascade: target[PROCESS_RESUME_CASCADE],
        resumeExpr: target[PROCESS_RESUME_IF] ? (target[PROCESS_RESUME_IF]as any).xpr as expr : undefined,
    }
    return resumeSpecs;
}