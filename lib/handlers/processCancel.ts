import { createProcessActionHandler } from './processActionHandler';
import {
  PROCESS_CANCEL_ON,
  PROCESS_CANCEL_CASCADE,
  PROCESS_CANCEL_IF,
  LOG_MESSAGES,
} from '../constants';

export const handleProcessCancel = createProcessActionHandler({
  action: 'cancel',
  annotations: {
    ON: PROCESS_CANCEL_ON,
    CASCADE: PROCESS_CANCEL_CASCADE,
    IF: PROCESS_CANCEL_IF,
  },
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_CANCELLED,
    FETCH_FAILED: 'PROCESS_CANCEL_FETCH_FAILED',
    INVALID_KEY: 'PROCESS_CANCEL_INVALID_KEY',
    EMPTY_KEY: 'PROCESS_CANCEL_EMPTY_KEY',
    FAILED: 'PROCESS_CANCEL_FAILED',
  },
});
