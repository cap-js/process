// Auth module - centralized authentication utilities

import cds from '@sap/cds';

export { getServiceCredentials } from './credentials';
export { TokenCache } from './token-cache';
export { 
  ITokenProvider, 
  TokenResult, 
  createXsuaaTokenProvider 
} from './token-provider';

import { getServiceCredentials } from './credentials';
import { createXsuaaTokenProvider, TokenResult } from './token-provider';

/**
 * Convenience function to get a service token directly.
 * Creates a token provider and fetches a token in one call.
 * Useful for tests and one-off token fetches.
 */
export async function getServiceToken(serviceName: string): Promise<TokenResult> {
  const credentials = getServiceCredentials(serviceName);
  if (!credentials) {
    throw new Error(cds.i18n.messages.at('AUTH_MISSING_BINDING_CREDENTIALS', [serviceName]));
  }
  const tokenProvider = createXsuaaTokenProvider(credentials);
  return tokenProvider.fetchToken();
}
