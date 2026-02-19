import cds from '@sap/cds';

/**
 * Gets service credentials from CDS environment configuration.
 * @param name - The service name to look up
 * @returns The credentials object or undefined if not found
 */
export const getServiceCredentials = (name: string): any => {
  return cds?.env?.requires?.[name]?.credentials;
};
