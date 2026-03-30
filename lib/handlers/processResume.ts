import { createProcessActionHandler } from './processActionHandler';
import { LOG_MESSAGES } from '../constants';

export const handleProcessResume = createProcessActionHandler({
  action: 'resume',
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_RESUMED,
    FETCH_FAILED: 'Failed to fetch entity for process resume.',
    INVALID_KEY: 'Failed to build business key for process resume.',
    EMPTY_KEY: 'Business key is empty for process resume.',
    FAILED: 'Failed to resume process with business key',
  },
});
