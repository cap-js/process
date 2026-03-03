import cds from '@sap/cds';
import crypto from 'crypto';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

const DEFAULT_CACHE_SIZE = 10_000;

export class BusinessKeyHasher {
  private cache: Map<string, string>;
  private maxSize: number;

  constructor(maxSize: number = DEFAULT_CACHE_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
    LOG.debug(`BusinessKeyHasher initialized with max size: ${maxSize}`);
  }

  getHashedKey(businessKey: string): string {
    const cached = this.getFromCache(businessKey);
    if (cached) {
      return cached;
    }

    const hash = crypto.createHash('sha256').update(businessKey).digest('hex');
    const hashedKey = `H:${hash}`;
    this.setInCache(businessKey, hashedKey);
    return hashedKey;
  }

  // get cached hash value, mark it as recently used by re-inserting it, and return it
  private getFromCache(businessKey: string): string | undefined {
    const value = this.cache.get(businessKey);
    if (value !== undefined) {
      this.cache.delete(businessKey);
      this.cache.set(businessKey, value);
      LOG.debug(`BusinessKeyHasher cache hit for key of length ${businessKey.length}`);
    }
    return value;
  }

  // insert new value, evicting oldest if cache size exceeded
  private setInCache(businessKey: string, hashedValue: string): void {
    // If key already exists, delete it first to update its position
    if (this.cache.has(businessKey)) {
      this.cache.delete(businessKey);
    } else if (this.cache.size >= this.maxSize) {
      // Evict the least recently used entry (first entry in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(businessKey, hashedValue);
  }

  size(): number {
    return this.cache.size;
  }
}

export const businessKeyHasher = new BusinessKeyHasher();
