/**
 * Process Service
 */
export const PROCESS_SERVICE = 'ProcessService' as const;

/**
 * Process Service Logger
 */
export const PROCESS_LOGGER_PREFIX = 'process' as const;

/**
 * Process Start Annotations
 */
export const PROCESS_START = '@build.process.start' as const;
export const PROCESS_START_ID = '@build.process.start.id' as const;
export const PROCESS_START_ON = '@build.process.start.on' as const;
export const PROCESS_START_IF = '@build.process.start.if' as const;

/**
 * Process Cancel Annotations
 */
export const PROCESS_CANCEL = '@build.process.cancel' as const;
export const PROCESS_CANCEL_ON = '@build.process.cancel.on' as const;
export const PROCESS_CANCEL_CASCADE = '@build.process.cancel.cascade' as const;
export const PROCESS_CANCEL_IF = '@build.process.cancel.if' as const;

/**
 * Process Suspend Annotations
 */
export const PROCESS_SUSPEND = '@build.process.suspend' as const;
export const PROCESS_SUSPEND_ON = '@build.process.suspend.on' as const;
export const PROCESS_SUSPEND_CASCADE = '@build.process.suspend.cascade' as const;
export const PROCESS_SUSPEND_IF = '@build.process.suspend.if' as const;

/**
 * Process Resume Annotations
 */
export const PROCESS_RESUME = '@build.process.resume' as const;
export const PROCESS_RESUME_ON = '@build.process.resume.on' as const;
export const PROCESS_RESUME_CASCADE = '@build.process.resume.cascade' as const;
export const PROCESS_RESUME_IF = '@build.process.resume.if' as const;

/**
 * Process Input Annotation
 */
export const PROCESS_INPUT = '@build.process.input' as const;

/**
 * Annotation prefix for filtering
 */
export const BUILD_PREFIX = '@build' as const;
export const PROCESS_PREFIX = '@build.process' as const;

/**
 * Process Event Annotations (Runtime)
 * These annotations are used on dynamically created ProcessService events
 */
export const PROCESS_START_EVENT = '@Process.StartEvent' as const;
export const PROCESS_CANCEL_EVENT = '@Process.CancelEvent' as const;
export const PROCESS_SUSPEND_EVENT = '@Process.SuspendEvent' as const;
export const PROCESS_RESUME_EVENT = '@Process.ResumeEvent' as const;
export const PROCESS_DEFINITION_ID = '@Process.DefinitionId' as const;

/**
 * Log Messages
 */

export const LOG_MESSAGES = {
    PROCESS_NOT_STARTED: 'Not starting process as start condition(s) are not met.',
    NO_PROCESS_INPUTS_DEFINED: 'No process start input annotations defined, fetching entire entity row for process start context.',
    PROCESS_NOT_SUSPENDED: 'Not suspending process as suspend condition(s) are not met.',
    PROCESS_NOT_RESUMED: 'Not resuming process as resume condition(s) are not met.',
    PROCESS_NOT_CANCELLED: 'Not canceling process as cancel condition(s) are not met.'
} as const;