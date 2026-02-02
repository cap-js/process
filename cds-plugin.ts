import cds, { Results, Target } from "@sap/cds"
import { handleProcessStart } from "./lib/processStartHandler"
import { handleProcessCancel } from "./lib/processCancelHandler"
import { handleProcessSuspend } from "./lib/processSuspendHandler"

cds.on("serving", async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return

  service.after("*", async (each: Results, req: cds.Request) => {
    
    const target = req.target as Target
    if (!target) return

    if (target["@build.process.start.id"] && target["@build.process.start.on"] && target["@build.process.start.on"] === req.event) {
      await handleProcessStart(target, req.data, req)

    } else if (target['@build.process.cancel.on'] && target['@build.process.cancel.cascade'] && target['@build.process.cancel.on'] === req.event) {
      await handleProcessCancel(target, req.data, req);

    } else if( target['@build.process.suspend.on'] && target['@build.process.suspend.cascade'] && target['@build.process.suspend.on'] === req.event) {
      await handleProcessSuspend(target, req.data, req);

     }
  })
})
