import cds, { DeleteRequest, expr, Results, Target } from "@sap/cds";
import { concatenateBusinessKey, fetchEntity } from "./handler";

enum ProcessSuspendOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessSuspendSpec = {
    on?: ProcessSuspendOn,
    cascade?: boolean,
    suspendExpr: expr | undefined
}

const LOG = cds.log("process");
const processNotSuspendedMessage = "Not suspending process as suspend condition(s) are not met";


export async function handleProcessSuspend(req: cds.Request) {

    if(req.event === 'DELETE' && ((req as DeleteRequest)._Process === undefined || (req as DeleteRequest)._Process?.length === 0)) {
        LOG.debug(processNotSuspendedMessage);
        return;
    }

    const target = req.target as Target;
    const data = (req as DeleteRequest)._Process ?? req.data
    
    // init specification
    const suspendSpecs = initSuspendSpecs(target);

    // fetch entity new when event is not delete, otherwise use data object
    const row = req.event === 'DELETE' ? data : await fetchEntity(
        data,
        req,
        suspendSpecs.suspendExpr    
    );

    // check suspend condition or if event is delete
    if(!row) {
        LOG.debug(processNotSuspendedMessage);
        return
    }

    // get business Key
    const businessKey = concatenateBusinessKey(target as cds.entity, {...row, ...req.data});
    
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
        suspendExpr: target['@build.process.suspend.when'] ? (target['@build.process.suspend.when']as any).xpr as expr : undefined,
    }
    return suspendSpecs; 
}