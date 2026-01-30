import cds, { Target } from "@sap/cds"
import {
  coerceToString,
} from "./lib/handler"
import { handleProcessStart } from "./lib/newProcessStartHandler"

cds.on("serving", async (service: cds.Service) => {
  if (service instanceof cds.ApplicationService == false) return

  service.after("*", async (each: object[], req: cds.Request) => {
    // validate annotations
    const target = req.target as Target // all entity annotations
    if (!target) return

    if (target["@build.process.start.id"] && target["@build.process.start.on"]) {
      // process start annotation found

      if (target["@build.process.start.on"] === req.event) {
        // process start should be initiated
        await handleProcessStart(
          target,
          coerceToString(target["@build.process.start.id"]!)!,
          coerceToString(
            target["@build.process.start.on"],
          )!,
          each,
          req,
        )
      }
    }
  })
})
