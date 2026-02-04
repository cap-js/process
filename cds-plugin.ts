import cds, { Results, Target } from "@sap/cds"
import { handleProcessStart } from "./lib/processStartHandler"
import { handleProcessCancel } from "./lib/processCancelHandler"
import { handleProcessSuspend } from "./lib/processSuspendHandler"
import { handleProcessResume } from "./lib/processResumeHandler"
import { addDeletedEntityToRequest } from "./lib/srv-before-utils"
import * as fs from 'fs'
import * as path from 'path'
import {
  PROCESS_START_ID,
  PROCESS_START_ON,
  PROCESS_CANCEL_ON,
  PROCESS_CANCEL_CASCADE,
  PROCESS_SUSPEND_ON,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_RESUME_ON,
  PROCESS_RESUME_CASCADE,
  PROCESS_START_EVENT,
  PROCESS_CANCEL_EVENT,
  PROCESS_SUSPEND_EVENT,
  PROCESS_RESUME_EVENT,
  PROCESS_DEFINITION_ID
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
  return !!(target[PROCESS_SUSPEND_ON] && (typeof target[PROCESS_SUSPEND_CASCADE] === "boolean") && target[PROCESS_SUSPEND_ON] === event);
}

function areResumeAnnotationsDefined(target: Target, event: string): boolean {
  return !!(target[PROCESS_RESUME_ON] && (typeof target[PROCESS_RESUME_CASCADE] === "boolean") && target[PROCESS_RESUME_ON] === event);
}

cds.on('compile.for.runtime', async csn => {
  const externalDir = path.join(process.cwd(), 'srv', 'external');

  function getAllCsnFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles = getAllCsnFiles(filePath, arrayOfFiles);
      } else if (file.endsWith('.json') || file.endsWith('.csn')) {
        arrayOfFiles.push(filePath);
      }
    });

    return arrayOfFiles;
  }

  if (!fs.existsSync(externalDir)) {
    LOG.warn(`Directory srv/external does not exist. Skipping process service extension.`);
    return;
  }
  let csnFiles: string[] = [];
  try {
    csnFiles = getAllCsnFiles(externalDir);
    LOG.info(`Found ${csnFiles.length} CSN file(s) in srv/external:`);
  } catch (error) {
    LOG.error('Error reading srv/external directory:', error);
    return;
  }
  if (csnFiles.length === 0) {
    LOG.warn('No CSN files found in srv/external. Skipping process service extension.');
    return;
  }

  for (const file of csnFiles) {
    LOG.debug(`Processing file: ${file}`);

    const fileContent = fs.readFileSync(file, 'utf-8');
    const data = JSON.parse(fileContent);

    const serviceName = Object.keys(data.definitions).find(
      key => data.definitions[key].kind === 'service'
    );
    const service = data.definitions[serviceName!];

    const processName = serviceName?.replace("Service", "");

    if (!csn.definitions) {
      return;
    }

    csn.definitions[`ProcessService.start${processName}`] = {
      kind: 'event',
      [PROCESS_START_EVENT]: true,
      [PROCESS_DEFINITION_ID]: service['@build.process'],
      elements: {
        context: {
          elements: data.definitions[`${serviceName}.ProcessInputs`].elements,
          notNull: true
        }
      },
    } as any;

    csn.definitions[`ProcessService.cancel${processName}`] = {
      kind: 'event',
      [PROCESS_CANCEL_EVENT]: true
    } as any;

    csn.definitions[`ProcessService.resume${processName}`] = {
      kind: 'event',
      [PROCESS_RESUME_EVENT]: true
    } as any;

    csn.definitions[`ProcessService.suspend${processName}`] = {
      kind: 'event',
      [PROCESS_SUSPEND_EVENT]: true
    } as any;

  }
});