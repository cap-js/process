import cds from '@sap/cds';
export interface ProcessServiceCredentials {
  endpoints: {
    api: string;
  };
  uaa: {
    url: string;
    clientid: string;
    clientsecret: string;
  };
}

/**
 * Gets service credentials from CDS environment configuration.
 * @param name - The service name to look up
 * @returns The credentials object or undefined if not found
 */
export const getServiceCredentials = (name: string): ProcessServiceCredentials => {
  return cds?.env?.requires?.[name]?.credentials;
};
