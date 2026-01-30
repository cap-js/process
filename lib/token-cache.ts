import cds from '@sap/cds';
const LOG = cds.log("process")

export class TokenCache {
    tokenCache: Map<any, any>;

    constructor() {
        this.tokenCache = new Map();
    }

    set(key: string, token: string, expiresIn: number): void {
        const expiresAt = Date.now() + expiresIn * 1000;
        this.tokenCache.set(key, { token, expiresAt });
        LOG.debug(`Token set for key: ${key}, expires in ${expiresIn} seconds.`)
    }

    get(key: string) {
        const entry = this.tokenCache.get(key);
        if (!entry) {
            LOG.debug(`No token found for ${key}.`);
            return undefined;
        }

        if (Date.now() >= entry.expiresAt) {
            this.tokenCache.delete(key);
            LOG.debug(`Token expired for key: ${key}.`);
            return undefined;
        }
        LOG.debug(`Token retrieved for key: ${key}.`);
        return entry.token;
    }
}