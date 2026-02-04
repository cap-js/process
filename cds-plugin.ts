import cds, { column_expr, DeleteRequest, Results, Target } from "@sap/cds"
import { getColumnsForProcessStart, handleProcessStart } from "./lib/processStartHandler"
import { handleProcessCancel } from "./lib/processCancelHandler"
import { handleProcessSuspend } from "./lib/processSuspendHandler"
import { handleProcessResume } from "./lib/processResumeHandler"
import { addDeletedEntityToRequest } from "./lib/srv-before-utils"
const LOG = cds.log("process");


cds.on("serving", async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return


  service.before("DELETE", async (req: cds.Request) => { 
    
    const target = req.target as any

    if (areCancelAnnotationsDefined(target, req.event) || areSuspendAnnotationsDefined(target, req.event) || areStartAnnotationsDefined(target, req.event) || areResumeAnnotationsDefined(target, req.event)) {  
      await addDeletedEntityToRequest(target, req, areStartAnnotationsDefined(target, req.event));
    }
  });

  //TODO: error handling with return req.reject
  //TODO: Batch request tests
  service.after("*", async (each: Results, req: cds.Request) => {
    
    const target = req.target as Target
    if (!target) return

    if (areStartAnnotationsDefined(target, req.event)) {
      await handleProcessStart(req);

    } 
    if (areCancelAnnotationsDefined(target, req.event)) {
      await handleProcessCancel(req);

    } 
    if (areSuspendAnnotationsDefined(target, req.event)) {
      await handleProcessSuspend(req);
    }

    if (areResumeAnnotationsDefined(target, req.event)) { 
      await handleProcessResume(req);
    }
  })
})

// TODO: move anno strings to constants
function areCancelAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target['@build.process.cancel.on'] && (typeof target['@build.process.cancel.cascade'] === "boolean") && target['@build.process.cancel.on'] === event)
}

function areStartAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target["@build.process.start.id"] && target["@build.process.start.on"] && target["@build.process.start.on"] === event);
}

function areSuspendAnnotationsDefined(target: Target, event: string): boolean {
  return !!( target['@build.process.suspend.on'] && (typeof target['@build.process.suspend.cascade'] === "boolean") && target['@build.process.suspend.on'] === event);
}

function areResumeAnnotationsDefined(target: Target, event: string): boolean {
  return !!( target['@build.process.resume.on'] && (typeof target['@build.process.resume.cascade'] === "boolean") && target['@build.process.resume.on'] === event);
}