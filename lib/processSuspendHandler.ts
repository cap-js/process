import cds, { DeleteRequest, expr, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchEntity } from "./handler";
import { PROCESS_SUSPEND_ON, PROCESS_SUSPEND_CASCADE, PROCESS_SUSPEND_WHEN, ERROR_CODES, LOG_MESSAGES, ERROR_MESSAGES } from "./constants";

type ProcessSuspendSpec = {
    on?: string,
    cascade?: boolean,
    suspendExpr: expr | undefined
}

const LOG = cds.log("process");

export async function handleProcessSuspend(req: cds.Request) {

    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_SUSPENDED);
        return;
    }

    const target = req.target as Target;
    const data = (req as DeleteRequest)._Process ?? req.data
    
    // init specification
    const suspendSpecs = initSuspendSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    let row;
    try {
        row = req.event === 'DELETE' ? data : await fetchEntity(
            data,
            req,
            suspendSpecs.suspendExpr    
        );
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_SUSPEND_FETCH_FAILED, error);
        return req.reject(500, ERROR_CODES.PROCESS_SUSPEND_FETCH_FAILED);
    }

    // check suspend condition or if event is delete
    if(!row) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_SUSPENDED);
        return;
    }

    // get business Key
    let businessKey;
    try {
        businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data});
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_SUSPEND_INVALID_KEY, error);
        return req.reject(400, ERROR_CODES.PROCESS_SUSPEND_INVALID_KEY);
    }

    if(!businessKey) {
        return req.reject(400, ERROR_CODES.PROCESS_SUSPEND_EMPTY_KEY);
    }
    
    // suspend process
    try {
        const processService = await cds.connect.to("ProcessService");
        await processService.emit("suspend", {
            businessKey: businessKey,
            cascade: suspendSpecs.cascade
        });
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_SUSPEND_FAILED + `${businessKey}`, error);
        return req.reject(500, ERROR_CODES.PROCESS_SUSPEND_FAILED);
    }
}

function initSuspendSpecs(target: Target): ProcessSuspendSpec {
    const suspendSpecs: ProcessSuspendSpec = {
        on: target[PROCESS_SUSPEND_ON] as string,
        cascade: target[PROCESS_SUSPEND_CASCADE],
        suspendExpr: target[PROCESS_SUSPEND_WHEN] ? (target[PROCESS_SUSPEND_WHEN]as any).xpr as expr : undefined,
    }
    return suspendSpecs; 
}