import { createProcessActionHandler } from './processActionHandler';
import { LOG_MESSAGES } from '../constants';

export const handleProcessSuspend = createProcessActionHandler({
  action: 'suspend',
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_SUSPENDED,
    FETCH_FAILED: 'Failed to fetch entity for process suspend.',
    INVALID_KEY: 'Failed to build business key for process suspend.',
    EMPTY_KEY: 'Business key is empty for process suspend.',
    FAILED: 'Failed to suspend process with business key',
  },
});
