/**
 * Process Start Annotations
 */
export const PROCESS_START = '@build.process.start' as const;
export const PROCESS_START_ID = '@build.process.start.id' as const;
export const PROCESS_START_ON = '@build.process.start.on' as const;
export const PROCESS_START_WHEN = '@build.process.start.when' as const;

/**
 * Process Cancel Annotations
 */
export const PROCESS_CANCEL = '@build.process.cancel' as const;
export const PROCESS_CANCEL_ON = '@build.process.cancel.on' as const;
export const PROCESS_CANCEL_CASCADE = '@build.process.cancel.cascade' as const;
export const PROCESS_CANCEL_WHEN = '@build.process.cancel.when' as const;

/**
 * Process Suspend Annotations
 */
export const PROCESS_SUSPEND = '@build.process.suspend' as const;
export const PROCESS_SUSPEND_ON = '@build.process.suspend.on' as const;
export const PROCESS_SUSPEND_CASCADE = '@build.process.suspend.cascade' as const;
export const PROCESS_SUSPEND_WHEN = '@build.process.suspend.when' as const;

/**
 * Process Resume Annotations
 */
export const PROCESS_RESUME = '@build.process.resume' as const;
export const PROCESS_RESUME_ON = '@build.process.resume.on' as const;
export const PROCESS_RESUME_CASCADE = '@build.process.resume.cascade' as const;
export const PROCESS_RESUME_WHEN = '@build.process.resume.when' as const;

/**
 * Process Input Annotation
 */
export const PROCESS_INPUT = '@build.process.input' as const;

/**
 * Annotation prefix for filtering
 */
export const BUILD_PREFIX = '@build' as const;

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
 * Error Codes
 * Error Codes for Process Handlers
 */
export const ERROR_CODES = {
    // Cancel errors
    PROCESS_CANCEL_FETCH_FAILED: 'PROCESS_CANCEL_FETCH_FAILED',
    PROCESS_CANCEL_INVALID_KEY: 'PROCESS_CANCEL_INVALID_KEY',
    PROCESS_CANCEL_EMPTY_KEY: 'PROCESS_CANCEL_EMPTY_KEY',
    PROCESS_CANCEL_FAILED: 'PROCESS_CANCEL_FAILED',
    // Start errors
    PROCESS_START_FETCH_FAILED: 'PROCESS_START_FETCH_FAILED',
    PROCESS_START_INVALID_KEY: 'PROCESS_START_INVALID_KEY',
    PROCESS_START_FAILED: 'PROCESS_START_FAILED',
    // Suspend errors
    PROCESS_SUSPEND_FETCH_FAILED: 'PROCESS_SUSPEND_FETCH_FAILED',
    PROCESS_SUSPEND_INVALID_KEY: 'PROCESS_SUSPEND_INVALID_KEY',
    PROCESS_SUSPEND_EMPTY_KEY: 'PROCESS_SUSPEND_EMPTY_KEY',
    PROCESS_SUSPEND_FAILED: 'PROCESS_SUSPEND_FAILED',
    // Resume errors
    PROCESS_RESUME_FETCH_FAILED: 'PROCESS_RESUME_FETCH_FAILED',
    PROCESS_RESUME_INVALID_KEY: 'PROCESS_RESUME_INVALID_KEY',
    PROCESS_RESUME_EMPTY_KEY: 'PROCESS_RESUME_EMPTY_KEY',
    PROCESS_RESUME_FAILED: 'PROCESS_RESUME_FAILED'
} as const;

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
    // Start errorrs
    PROCESS_START_FETCH_FAILED: 'Failed to fetch entity for process start.',
    PROCESS_START_INVALID_KEY: 'Failed to build business key for process start.',
    PROCESS_START_FAILED: 'Failed to start process with definition ID ',
    // Suspend errors
    PROCESS_SUSPEND_FETCH_FAILED: 'Failed to fetch entity for process suspend.',
    PROCESS_SUSPEND_INVALID_KEY: 'Failed to build business key for process suspend.',
    PROCESS_SUSPEND_EMPTY_KEY: 'Business key is empty for process suspend.',
    PROCESS_SUSPEND_FAILED: 'Failed to suspend process with business Key ',
    // Resume errors
    PROCESS_RESUME_FETCH_FAILED: 'Failed to fetch entity for process resume.',
    PROCESS_RESUME_INVALID_KEY: 'Failed to build business key for process resume.',
    PROCESS_RESUME_EMPTY_KEY: 'Business key is empty for process resume.',
    PROCESS_RESUME_FAILED: 'Failed to resume process with business Key ',
    // Cancel errors
    PROCESS_CANCEL_FETCH_FAILED: 'Failed to fetch entity for process cancellation.',
    PROCESS_CANCEL_INVALID_KEY: 'Failed to build business key for process cancellation.',
    PROCESS_CANCEL_EMPTY_KEY: 'Business key is empty for process cancellation.',
    PROCESS_CANCEL_FAILED: 'Failed to cancel process with business Key '
} as const;

/**
 * Log Messages
 */
export const LOG_MESSAGES = {
    PROCESS_NOT_STARTED: "Not starting process as start condition(s) are not met",
    NO_PROCESS_INPUTS_DEFINED: "No process start input annotations defined, fetching entire entity row for process start context.",
    PROCESS_NOT_SUSPENDED: "Not suspending process as suspend condition(s) are not met",
    PROCESS_NOT_RESUMED: "Not resuming process as resume condition(s) are not met",
    PROCESS_NOT_CANCELLED: "Not canceling process as cancel condition(s) are not met"
} as const;