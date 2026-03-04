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
    FETCH_FAILED: 'Failed to fetch entity for process cancellation.',
    INVALID_KEY: 'Failed to build business key for process cancellation.',
    EMPTY_KEY: 'Business key is empty for process cancellation.',
    FAILED: 'Failed to cancel process with business key',
  },
});
