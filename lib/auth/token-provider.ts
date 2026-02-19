import { XsuaaService } from '@sap/xssec';
import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

// ============ Types ============

export interface TokenResult {
  jwt: string;
  expires_in: number;
}

// ============ Interface ============

export interface ITokenProvider {
  fetchToken(tenantId?: string): Promise<TokenResult>;
}

// ============ XSUAA Implementation ============

async function fetchXsuaaToken(
  uaaCredentials: any,
  tenantId?: string
): Promise<TokenResult> {
  const xsuaaService = new XsuaaService(uaaCredentials);
  const { access_token: jwt, expires_in } = await xsuaaService.fetchClientCredentialsToken({
    ...(tenantId && { 'zid': tenantId })
  });

  if (!jwt) {
    throw new Error(cds.i18n.messages.at('AUTH_EMPTY_JWT'));
  }

  LOG.debug('XSUAA token fetched successfully');
  return { jwt, expires_in };
}

// ============ Factory ============

export function createXsuaaTokenProvider(credentials: any): ITokenProvider {
  if (!credentials?.uaa) {
    throw new Error(cds.i18n.messages.at('AUTH_MISSING_UAA_CREDENTIALS'));
  }

  return {
    fetchToken: (tenantId?: string) => fetchXsuaaToken(credentials.uaa, tenantId)
  };
}
