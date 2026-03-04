/**
 * Process Service
 */
export const PROCESS_SERVICE = 'ProcessService' as const;

/**
 * Process Service Logger
 */
export const PROCESS_LOGGER_PREFIX = 'process' as const;

/**
 * CRUD Operation
 */
export const CUD_EVENTS = ['CREATE', 'UPDATE', 'DELETE'] as const;

/**
 * Process Start Annotations
 */
export const PROCESS_START = '@bpm.process.start' as const;
export const PROCESS_START_ID = '@bpm.process.start.id' as const;
export const PROCESS_START_ON = '@bpm.process.start.on' as const;
export const PROCESS_START_IF = '@bpm.process.start.if' as const;

/**
 * Process Cancel Annotations
 */
export const PROCESS_CANCEL = '@bpm.process.cancel' as const;
export const PROCESS_CANCEL_ON = '@bpm.process.cancel.on' as const;
export const PROCESS_CANCEL_CASCADE = '@bpm.process.cancel.cascade' as const;
export const PROCESS_CANCEL_IF = '@bpm.process.cancel.if' as const;

/**
 * Process Suspend Annotations
 */
export const PROCESS_SUSPEND = '@bpm.process.suspend' as const;
export const PROCESS_SUSPEND_ON = '@bpm.process.suspend.on' as const;
export const PROCESS_SUSPEND_CASCADE = '@bpm.process.suspend.cascade' as const;
export const PROCESS_SUSPEND_IF = '@bpm.process.suspend.if' as const;

/**
 * Process Resume Annotations
 */
export const PROCESS_RESUME = '@bpm.process.resume' as const;
export const PROCESS_RESUME_ON = '@bpm.process.resume.on' as const;
export const PROCESS_RESUME_CASCADE = '@bpm.process.resume.cascade' as const;
export const PROCESS_RESUME_IF = '@bpm.process.resume.if' as const;

/**
 * Process Input Annotation
 */
export const PROCESS_INPUT = '@bpm.process.input' as const;

/**
 * Annotation prefix for filtering
 */
export const BUILD_PREFIX = '@bpm' as const;
export const PROCESS_PREFIX = '@bpm.process' as const;

/**
 * Qualifier prefix for multiple process start annotations
 * Usage: @build.process.start #qualifier: { id: '...', on: '...' }
 * Stored in CDS as: @build.process.start#qualifier.id, @build.process.start#qualifier.on, etc.
 */
export const PROCESS_START_QUALIFIER_PREFIX = '@build.process.start#' as const;

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
  NO_PROCESS_INPUTS_DEFINED:
    'No process start input annotations defined, fetching entire entity row for process start context.',
  PROCESS_NOT_SUSPENDED: 'Not suspending process as suspend condition(s) are not met.',
  PROCESS_NOT_RESUMED: 'Not resuming process as resume condition(s) are not met.',
  PROCESS_NOT_CANCELLED: 'Not canceling process as cancel condition(s) are not met.',
} as const;
