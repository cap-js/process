import { DeleteRequest, expr, Target } from "@sap/cds";
import cds from "@sap/cds"
import { concatenateBusinessKey, fetchEntity } from "./handler";
import { PROCESS_CANCEL_ON, PROCESS_CANCEL_CASCADE, PROCESS_CANCEL_WHEN, ERROR_CODES, LOG_MESSAGES, ERROR_MESSAGES } from "./constants";

type ProcessCancelSpec = {
    on?: string,
    cascade?: boolean,
    cancelExpr: expr | undefined;
}

const LOG = cds.log("process");

export async function handleProcessCancel(
    req: cds.Request
) {
    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_CANCELLED);
        return;
    }
    
    const target = req.target as Target;
    const data = (req as DeleteRequest)._Process ?? req.data
      
    // init specification
    const cancelSpecs = initCancelSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    let row;
    try {
        row = req.event === 'DELETE' ? data : await fetchEntity(
            data,
            req,
            cancelSpecs.cancelExpr    
        );
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_CANCEL_FETCH_FAILED, error);
        return req.reject(500, ERROR_CODES.PROCESS_CANCEL_FETCH_FAILED);
    }
    

    // when row is undefined, cancel condition not met
    if(!row) {
        LOG.debug(LOG_MESSAGES.PROCESS_NOT_CANCELLED);
        return
    }

    // get business Key
    let businessKey;
    try {
        businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data})
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_CANCEL_INVALID_KEY, error);
        return req.reject(400, ERROR_CODES.PROCESS_CANCEL_INVALID_KEY);
    }

    if(!businessKey) {
        return req.reject(400, ERROR_CODES.PROCESS_CANCEL_EMPTY_KEY);
    }

    // cancel process
    try {
        const processService = await cds.connect.to("ProcessService")
        await processService.emit("cancel", {
            businessKey: businessKey,
            cascade: cancelSpecs.cascade
        })
    } catch (error) {
        LOG.error(ERROR_MESSAGES.PROCESS_CANCEL_FAILED + `${businessKey}`, error);
        return req.reject(500, ERROR_CODES.PROCESS_CANCEL_FAILED);
    }

}

function initCancelSpecs(target: Target): ProcessCancelSpec { 
    const cancelSpecs: ProcessCancelSpec = {
        on: target[PROCESS_CANCEL_ON] as string,
        cascade: target[PROCESS_CANCEL_CASCADE],
        cancelExpr: target[PROCESS_CANCEL_WHEN] ? (target[PROCESS_CANCEL_WHEN]as any).xpr as expr : undefined,
    }
    return cancelSpecs;
}