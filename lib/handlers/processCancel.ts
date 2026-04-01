import { createProcessActionHandler } from './processActionHandler';
import { LOG_MESSAGES } from '../constants';

export const handleProcessCancel = createProcessActionHandler({
  action: 'cancel',
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_CANCELLED,
    FETCH_FAILED: 'Failed to fetch entity for process cancellation.',
    INVALID_KEY: 'Failed to build business key for process cancellation.',
    EMPTY_KEY: 'Business key is empty for process cancellation.',
    FAILED: 'Failed to cancel process with business key',
  },
});
