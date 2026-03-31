import {
  createProcessActionAddDeletedEntityHandler,
  createProcessActionHandler,
} from './processActionHandler';
import {
  LOG_MESSAGES,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_SUSPEND_IF,
  PROCESS_SUSPEND_ON,
} from '../constants';

const action = 'suspend';

export const handleProcessSuspend = createProcessActionHandler({
  action: action,
  annotations: {
    ON: PROCESS_SUSPEND_ON,
    CASCADE: PROCESS_SUSPEND_CASCADE,
    IF: PROCESS_SUSPEND_IF,
  },
  logMessages: {
    NOT_TRIGGERED: LOG_MESSAGES.PROCESS_NOT_SUSPENDED,
    FETCH_FAILED: 'Failed to fetch entity for process suspend.',
    INVALID_KEY: 'Failed to build business key for process suspend.',
    EMPTY_KEY: 'Business key is empty for process suspend.',
    FAILED: 'Failed to suspend process with business key',
  },
});

export const addDeletedEntityToRequestSuspend = createProcessActionAddDeletedEntityHandler({
  action: action,
  annotations: {
    IF: PROCESS_SUSPEND_IF,
  },
});
