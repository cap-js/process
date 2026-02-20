import { createProcessActionHandler } from './processActionHandler';
import {
  PROCESS_RESUME_ON,
  PROCESS_RESUME_CASCADE,
  PROCESS_RESUME_IF,
  LOG_MESSAGES,
} from '../constants';

export const handleProcessResume = createProcessActionHandler({
  action: 'resume',
  annotations: {
    ON: PROCESS_RESUME_ON,
    CASCADE: PROCESS_RESUME_CASCADE,
    IF: PROCESS_RESUME_IF,
  },
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_RESUMED,
    FETCH_FAILED: 'PROCESS_RESUME_FETCH_FAILED',
    INVALID_KEY: 'PROCESS_RESUME_INVALID_KEY',
    EMPTY_KEY: 'PROCESS_RESUME_EMPTY_KEY',
    FAILED: 'PROCESS_RESUME_FAILED',
  },
});
