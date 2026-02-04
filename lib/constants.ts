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
