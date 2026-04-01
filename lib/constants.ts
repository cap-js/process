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

/** Business Key Annotations
 *
 */
export const BUSINESS_KEY = '@bpm.process.businessKey' as const;
export const BUSINESS_KEY_MAX_LENGTH = 255;

/**
 * Business key alias const
 */
export const BUSINESS_KEY_ALIAS = 'as businessKey' as const;

/**
 * Process annotation base prefixes
 */
export const PROCESS_START = '@bpm.process.start' as const;
export const PROCESS_CANCEL = '@bpm.process.cancel' as const;
export const PROCESS_SUSPEND = '@bpm.process.suspend' as const;
export const PROCESS_RESUME = '@bpm.process.resume' as const;

/**
 * Annotation property suffixes.
 */
export const SUFFIX_ID = '.id' as const;
export const SUFFIX_ON = '.on' as const;
export const SUFFIX_IF = '.if' as const;
export const SUFFIX_CASCADE = '.cascade' as const;
export const SUFFIX_INPUTS = '.inputs' as const;

/**
 * Derived full-path annotation keys (unqualified).
 */
export const PROCESS_START_ID = `${PROCESS_START}${SUFFIX_ID}` as const;
export const PROCESS_START_ON = `${PROCESS_START}${SUFFIX_ON}` as const;
export const PROCESS_START_IF = `${PROCESS_START}${SUFFIX_IF}` as const;
export const PROCESS_START_INPUTS = `${PROCESS_START}${SUFFIX_INPUTS}` as const;

export const PROCESS_CANCEL_ON = `${PROCESS_CANCEL}${SUFFIX_ON}` as const;
export const PROCESS_CANCEL_CASCADE = `${PROCESS_CANCEL}${SUFFIX_CASCADE}` as const;
export const PROCESS_CANCEL_IF = `${PROCESS_CANCEL}${SUFFIX_IF}` as const;

export const PROCESS_SUSPEND_ON = `${PROCESS_SUSPEND}${SUFFIX_ON}` as const;
export const PROCESS_SUSPEND_CASCADE = `${PROCESS_SUSPEND}${SUFFIX_CASCADE}` as const;
export const PROCESS_SUSPEND_IF = `${PROCESS_SUSPEND}${SUFFIX_IF}` as const;

export const PROCESS_RESUME_ON = `${PROCESS_RESUME}${SUFFIX_ON}` as const;
export const PROCESS_RESUME_CASCADE = `${PROCESS_RESUME}${SUFFIX_CASCADE}` as const;
export const PROCESS_RESUME_IF = `${PROCESS_RESUME}${SUFFIX_IF}` as const;

/**
 * Annotation prefix for filtering
 */
export const BUILD_PREFIX = '@bpm' as const;
export const PROCESS_PREFIX = '@bpm.process' as const;

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
  PROCESS_INPUTS_FROM_DEFINITION:
    'No inputs annotation defined. Filtering entity fields by process definition inputs.',
  PROCESS_NOT_SUSPENDED: 'Not suspending process as suspend condition(s) are not met.',
  PROCESS_NOT_RESUMED: 'Not resuming process as resume condition(s) are not met.',
  PROCESS_NOT_CANCELLED: 'Not canceling process as cancel condition(s) are not met.',
} as const;
