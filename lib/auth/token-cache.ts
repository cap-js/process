import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';
import { ITokenProvider, TokenResult } from './token-provider';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

interface CacheEntry {
  token: string;
  expiresAt: number;
}

export class CachingTokenProvider {
  private cache: Map<string, CacheEntry>;
  private pendingFetches: Map<string, Promise<string>>;
  private tokenProvider: ITokenProvider;

  constructor(tokenProvider: ITokenProvider) {
    this.cache = new Map();
    this.pendingFetches = new Map();
    this.tokenProvider = tokenProvider;
  }

  async getToken(tenantId?: string): Promise<string> {
    const cacheKey = tenantId ?? 'single-tenant';

    // check cache first
    const cachedToken = this.getCached(cacheKey);
    if (cachedToken) {
      LOG.debug(`Using cached token for tenant: ${cacheKey}`);
      return cachedToken;
    }

    // check if a fetch is already in progress for this tenant
    const pendingFetch = this.pendingFetches.get(cacheKey);
    if (pendingFetch) {
      LOG.debug(`Waiting for pending token fetch for tenant: ${cacheKey}`);
      return pendingFetch;
    }

    // start new fetch and track the promise
    const fetchPromise = this.fetchAndCache(cacheKey, tenantId);
    this.pendingFetches.set(cacheKey, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      LOG.debug(`Deleting fetch promise from pending fetches for tenant: ${cacheKey}`);
      this.pendingFetches.delete(cacheKey);
    }
  }

  private getCached(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      LOG.debug(`No token found for ${key}.`);
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      LOG.debug(`Token expired for tenant: ${key}`);
      return undefined;
    }

    LOG.debug(`Token retrieved for key: ${key}.`);
    return entry.token;
  }

  private async fetchAndCache(cacheKey: string, tenantId?: string): Promise<string> {
    const { jwt, expires_in }: TokenResult = await this.tokenProvider.fetchToken(tenantId);
    const expiresAt = Date.now() + expires_in * 1000;
    this.cache.set(cacheKey, { token: jwt, expiresAt });
    LOG.debug(
      `Token fetched and cached for tenant: ${cacheKey}, expires in ${expires_in} seconds.`,
    );
    return jwt;
  }
}
