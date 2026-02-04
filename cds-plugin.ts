import cds, { Results, Target } from "@sap/cds"
import {  handleProcessStart } from "./lib/processStartHandler"
import { handleProcessCancel } from "./lib/processCancelHandler"
import { handleProcessSuspend } from "./lib/processSuspendHandler"
import { handleProcessResume } from "./lib/processResumeHandler"
import { addDeletedEntityToRequest } from "./lib/srv-before-utils"
import { 
  PROCESS_START_ID, 
  PROCESS_START_ON, 
  PROCESS_CANCEL_ON, 
  PROCESS_CANCEL_CASCADE, 
  PROCESS_SUSPEND_ON, 
  PROCESS_SUSPEND_CASCADE, 
  PROCESS_RESUME_ON, 
  PROCESS_RESUME_CASCADE 
} from "./lib/constants"
const LOG = cds.log("process");


cds.on("serving", async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return


  service.before("DELETE", async (req: cds.Request) => { 
    
    const target = req.target as Target

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

function areCancelAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_CANCEL_ON] && (typeof target[PROCESS_CANCEL_CASCADE] === "boolean") && target[PROCESS_CANCEL_ON] === event)
}

function areStartAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_START_ID] && target[PROCESS_START_ON] && target[PROCESS_START_ON] === event);
}

function areSuspendAnnotationsDefined(target: Target, event: string): boolean {
  return !!( target[PROCESS_SUSPEND_ON] && (typeof target[PROCESS_SUSPEND_CASCADE] === "boolean") && target[PROCESS_SUSPEND_ON] === event);
}

function areResumeAnnotationsDefined(target: Target, event: string): boolean {
  return !!( target[PROCESS_RESUME_ON] && (typeof target[PROCESS_RESUME_CASCADE] === "boolean") && target[PROCESS_RESUME_ON] === event);
}