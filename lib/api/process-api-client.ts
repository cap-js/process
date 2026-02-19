import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);
const BASE_PATH = '/public/unified/v1';

// ============ Types ============

export interface ProcessHeader {
  uid: string;
  name: string;
  identifier: string;
  type: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  valid?: boolean;
  projectId?: string;
  header: {
    inputs: JsonSchema;
    outputs: JsonSchema;
    processAttributes: JsonSchema;
  };
  dependencies?: Dependency[];
  dataTypes?: DataType[];
}

export interface DataType {
  uid: string;
  name: string;
  identifier: string;
  type: string;
  header?: JsonSchema;
  dependencies?: Dependency[];
}

export interface Dependency {
  artifactUid: string;
  type: 'both' | 'input' | 'output' | 'content' | string;
}

export interface JsonSchema {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  $ref?: string;
  refName?: string;
}

// ============ Interface ============

export interface IProcessApiClient {
  fetchProcessHeader(projectId: string, processId: string): Promise<ProcessHeader>;
  fetchArtifact(projectId: string, artifactUid: string): Promise<DataType>;
  fetchAllDataTypes(projectId: string, dependencies: Dependency[]): Promise<DataType[]>;
}

// ============ Implementation Functions ============

async function fetchJson<T>(url: string, jwt: string): Promise<T> {
  LOG.debug('Invoking url: ' + url);

  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${jwt}` }
  });

  if (!response.ok) {
    const body = await response.text();
    LOG.error(`API request failed. Status: ${response.status}, Body: ${body}`);
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchProcessHeader(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  processId: string
): Promise<ProcessHeader> {
  const url = `${serviceUrl}${BASE_PATH}/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(processId)}`;
  return fetchJson<ProcessHeader>(url, jwt);
}

export async function fetchArtifact(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  artifactUid: string
): Promise<DataType> {
  const url = `${serviceUrl}${BASE_PATH}/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactUid)}`;
  return fetchJson<DataType>(url, jwt);
}

export async function fetchAllDataTypes(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  dependencies: Dependency[]
): Promise<DataType[]> {
  const result: DataType[] = [];
  const fetched = new Set<string>();
  const queue = [...dependencies];

  while (queue.length > 0) {
    const dep = queue.shift()!;

    if (fetched.has(dep.artifactUid)) continue;
    if (dep.type === 'content') {
      LOG.debug(`Skipping content dependency: ${dep.artifactUid}`);
      continue;
    }

    fetched.add(dep.artifactUid);

    try {
      const artifact = await fetchArtifact(serviceUrl, jwt, projectId, dep.artifactUid);

      if (artifact.type === 'datatype' || artifact.type === 'bpi.datatype') {
        LOG.debug(`Fetched data type: ${artifact.name}`);
        result.push(artifact);

        // Queue nested dependencies
        artifact.dependencies
          ?.filter(d => !fetched.has(d.artifactUid))
          .forEach(d => queue.push(d));
      }
    } catch (error) {
      LOG.warn(`Could not fetch artifact ${dep.artifactUid}: ${error}`);
    }
  }

  return result;
}

// ============ Factory Function ============

export function createProcessApiClient(
  serviceUrl: string,
  getToken: () => Promise<string>
): IProcessApiClient {
  return {
    fetchProcessHeader: async (projectId, processId) => {
      const jwt = await getToken();
      return fetchProcessHeader(serviceUrl, jwt, projectId, processId);
    },

    fetchArtifact: async (projectId, artifactUid) => {
      const jwt = await getToken();
      return fetchArtifact(serviceUrl, jwt, projectId, artifactUid);
    },

    fetchAllDataTypes: async (projectId, dependencies) => {
      const jwt = await getToken();
      return fetchAllDataTypes(serviceUrl, jwt, projectId, dependencies);
    }
  };
}
