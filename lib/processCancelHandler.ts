import { DeleteRequest, expr, Results, Target } from "@sap/cds";
import cds from "@sap/cds"
import { concatenateBusinessKey, fetchEntity } from "./handler";

enum ProcessCancelOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessCancelSpec = {
    on?: ProcessCancelOn,
    cascade?: boolean,
    cancelExpr: expr | undefined;
}

const LOG = cds.log("process");
const processNotCancellingMessage = "Not cancelling process as cancel condition(s) are not met";

export async function handleProcessCancel(
    req: cds.Request
) {
    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(processNotCancellingMessage);
        return;
      }
    
      const target = req.target as Target;
      const data = (req as DeleteRequest)._Process ?? req.data
      
    // init specification
    const cancelSpecs = initCancelSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    const row = req.event === 'DELETE' ? data : await fetchEntity(
        data,
        req,
        cancelSpecs.cancelExpr    
    );
    

    // check cancel condition or if event is delete
    if(!row) {
        LOG.debug(processNotCancellingMessage);
        return
    }

    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data})

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
        cancelExpr: target['@build.process.cancel.when'] ? (target['@build.process.cancel.when']as any).xpr as expr : undefined,
    }
    return cancelSpecs;
}