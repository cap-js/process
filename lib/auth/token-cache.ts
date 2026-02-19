import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export class TokenCache {
  private cache: Map<string, { token: string; expiresAt: number }>;

  constructor() {
    this.cache = new Map();
  }

  set(key: string, token: string, expiresIn: number): void {
    const expiresAt = Date.now() + expiresIn * 1000;
    this.cache.set(key, { token, expiresAt });
    LOG.debug(`Token set for key: ${key}, expires in ${expiresIn} seconds.`);
  }

  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      LOG.debug(`No token found for ${key}.`);
      return undefined;
    }

    if (Date.now() >= entry.expiresAt) {
      this.cache.delete(key);
      LOG.debug(`Token expired for key: ${key}.`);
      return undefined;
    }

    LOG.debug(`Token retrieved for key: ${key}.`);
    return entry.token;
  }
}
