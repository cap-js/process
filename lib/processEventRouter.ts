import cds from '@sap/cds';
import {
    PROCESS_START_EVENT,
    PROCESS_CANCEL_EVENT,
    PROCESS_SUSPEND_EVENT,
    PROCESS_RESUME_EVENT,
    PROCESS_DEFINITION_ID
} from './constants';

const LOG = cds.log("process");

interface ProcessDefinition {
    [PROCESS_START_EVENT]?: boolean;
    [PROCESS_CANCEL_EVENT]?: boolean;
    [PROCESS_SUSPEND_EVENT]?: boolean;
    [PROCESS_RESUME_EVENT]?: boolean;
    [PROCESS_DEFINITION_ID]?: string;
}

export enum ProcessEventType {
    START = 'start',
    CANCEL = 'cancel',
    SUSPEND = 'suspend',
    RESUME = 'resume'
}

const PROCESS_ANNOTATIONS = {
    [ProcessEventType.START]: PROCESS_START_EVENT,
    [ProcessEventType.CANCEL]: PROCESS_CANCEL_EVENT,
    [ProcessEventType.SUSPEND]: PROCESS_SUSPEND_EVENT,
    [ProcessEventType.RESUME]: PROCESS_RESUME_EVENT
} as const;

function getProcessDefinition(eventName: string): ProcessDefinition | undefined {
    const def = cds.model?.definitions?.[`${eventName}`];
    return def as ProcessDefinition | undefined;
}

export function hasProcessAnnotation(
    eventName: string,
    eventType: ProcessEventType
): boolean {
    const definition = getProcessDefinition(eventName);
    if (!definition) return false;

    const annotation = PROCESS_ANNOTATIONS[eventType];
    return !!definition[annotation as keyof ProcessDefinition];
}

export function getDefinitionId(eventName: string): string | undefined {
    const definition = getProcessDefinition(eventName);
    return definition?.[PROCESS_DEFINITION_ID];
}

export async function handleProcessRoutingForEvent(
    service: cds.Service,
    req: cds.Request
): Promise<void> {
    const eventName = req.event;
    const definition = getProcessDefinition(eventName);

    if (!definition) {
        LOG.warn("Process Definition is undefined")
        return;
    }

    if (definition[PROCESS_START_EVENT]) {
        const definitionId = definition[PROCESS_DEFINITION_ID];
        if (!definitionId) {
            LOG.warn(`Event ${eventName} has ${PROCESS_START_EVENT} but missing ${PROCESS_DEFINITION_ID}`);
            return;
        }

        await service.emit(ProcessEventType.START, {
            definitionId,
            context: req.data
        });
        return;
    }

    if (definition[PROCESS_CANCEL_EVENT]) {
        await service.emit(ProcessEventType.CANCEL, {
            businessKey: req.data.businessKey,
            cascade: req.data.cascade
        });
        return;
    }

    if (definition[PROCESS_SUSPEND_EVENT]) {
        await service.emit(ProcessEventType.SUSPEND, {
            businessKey: req.data.businessKey,
            cascade: req.data.cascade
        });
        return;
    }

    if (definition[PROCESS_RESUME_EVENT]) {
        await service.emit(ProcessEventType.RESUME, {
            businessKey: req.data.businessKey,
            cascade: req.data.cascade
        });
        return;
    }
}
