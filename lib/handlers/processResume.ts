import { createProcessActionHandler } from './processActionHandler';

export const handleProcessResume = createProcessActionHandler({
  action: 'resume',
  logMessages: {
    NOT_TRIGGERED: 'Not resuming process as resume condition(s) are not met.',
    FETCH_FAILED: 'Failed to fetch entity for process resume.',
    INVALID_KEY: 'Failed to build business key for process resume.',
    EMPTY_KEY: 'Business key is empty for process resume.',
    FAILED: 'Failed to resume process with business key',
  },
});
