import { createProcessActionHandler } from './processActionHandler';
import {
  PROCESS_SUSPEND_ON,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_SUSPEND_IF,
  LOG_MESSAGES,
} from '../constants';

export const handleProcessSuspend = createProcessActionHandler({
  action: 'suspend',
  annotations: {
    ON: PROCESS_SUSPEND_ON,
    CASCADE: PROCESS_SUSPEND_CASCADE,
    IF: PROCESS_SUSPEND_IF,
  },
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_SUSPENDED,
    FETCH_FAILED: 'PROCESS_SUSPEND_FETCH_FAILED',
    INVALID_KEY: 'PROCESS_SUSPEND_INVALID_KEY',
    EMPTY_KEY: 'PROCESS_SUSPEND_EMPTY_KEY',
    FAILED: 'PROCESS_SUSPEND_FAILED',
  },
});
