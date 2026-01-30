import { XsuaaService } from '@sap/xssec';
import cds from '@sap/cds';

export const getServiceCredentials = (name: string) => (cds?.env?.requires[name] || [])?.credentials;

export async function getServiceToken(serviceName: string) {
    const srvCredentials = getServiceCredentials(serviceName);
    if (!srvCredentials) {
        throw new Error(`Missing binding credentials for service: ${serviceName}`);
    }

    const tenantid = cds.context?.tenant;
    const xsuaaService = new XsuaaService(srvCredentials.uaa);
    const { access_token: jwt, expires_in } = await xsuaaService.fetchClientCredentialsToken({
        ...(tenantid && { 'zid': tenantid })
    })

    if (!jwt) {
        throw new Error(`Empty JWT returned from authorization service for bound service "${serviceName}"`);
    }
    return { jwt, expires_in };
}

