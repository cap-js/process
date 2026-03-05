import {
  createProcessActionAddDeletedEntityHandler,
  createProcessActionHandler,
} from './processActionHandler';
import {
  PROCESS_RESUME_ON,
  PROCESS_RESUME_CASCADE,
  PROCESS_RESUME_IF,
  LOG_MESSAGES,
  PROCESS_RESUME_BUSINESS_KEY,
} from '../constants';

const action = 'resume';

export const handleProcessResume = createProcessActionHandler({
  action: action,
  annotations: {
    ON: PROCESS_RESUME_ON,
    CASCADE: PROCESS_RESUME_CASCADE,
    IF: PROCESS_RESUME_IF,
    BUSINESS_KEY: PROCESS_RESUME_BUSINESS_KEY,
  },
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_RESUMED,
    FETCH_FAILED: 'Failed to fetch entity for process resume.',
    INVALID_KEY: 'Failed to build business key for process resume.',
    EMPTY_KEY: 'Business key is empty for process resume.',
    FAILED: 'Failed to resume process with business key',
  },
});

export const addDeletedEntityToRequestResume = createProcessActionAddDeletedEntityHandler({
  action: action,
  annotations: {
    IF: PROCESS_RESUME_IF,
  },
});
