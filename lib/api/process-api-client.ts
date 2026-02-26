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
  type?: 'string' | 'boolean' | 'number' | 'integer' | 'object' | 'array';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
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
    headers: { Authorization: `Bearer ${jwt}` },
  });

  if (!response.ok) {
    const body = await response.text();
    LOG.error(`API request failed. Status: ${response.status}, Body: ${body}`);
    throw new Error(
      cds.i18n.messages.at('API_REQUEST_FAILED', [response.status, response.statusText]),
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchProcessHeader(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  processId: string,
): Promise<ProcessHeader> {
  const url = `${serviceUrl}${BASE_PATH}/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(processId)}`;
  return fetchJson<ProcessHeader>(url, jwt);
}

export async function fetchArtifact(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  artifactUid: string,
): Promise<DataType> {
  const url = `${serviceUrl}${BASE_PATH}/projects/${encodeURIComponent(projectId)}/artifacts/${encodeURIComponent(artifactUid)}`;
  return fetchJson<DataType>(url, jwt);
}

export async function fetchAllDataTypes(
  serviceUrl: string,
  jwt: string,
  projectId: string,
  dependencies: Dependency[],
): Promise<DataType[]> {
  const result: DataType[] = [];
  const fetched = new Set<string>();

  // Filter initial batch: skip already fetched and content dependencies
  let currentBatch = dependencies.filter((d) => {
    if (d.type === 'content') {
      LOG.debug(`Skipping content dependency: ${d.artifactUid}`);
      return false;
    }
    return !fetched.has(d.artifactUid);
  });

  while (currentBatch.length > 0) {
    // Mark all in current batch as fetched to avoid duplicates
    currentBatch.forEach((d) => fetched.add(d.artifactUid));

    // Fetch all artifacts in this batch in parallel
    const fetchPromises = currentBatch.map((dep) =>
      fetchArtifact(serviceUrl, jwt, projectId, dep.artifactUid)
        .then((artifact) => ({ status: 'fulfilled' as const, artifact, dep }))
        .catch((error) => ({ status: 'rejected' as const, error, dep })),
    );

    // eslint-disable-next-line no-await-in-loop -- Intentional: must await batch to collect nested dependencies for next iteration
    const responses = await Promise.all(fetchPromises);

    // Collect next batch of dependencies from successful fetches
    const nextBatch: Dependency[] = [];

    for (const response of responses) {
      if (response.status === 'rejected') {
        LOG.warn(`Could not fetch artifact ${response.dep.artifactUid}: ${response.error}`);
        continue;
      }

      const artifact = response.artifact;
      if (artifact.type === 'datatype' || artifact.type === 'bpi.datatype') {
        LOG.debug(`Fetched data type: ${artifact.name}`);
        result.push(artifact);

        // Collect nested dependencies for next batch
        artifact.dependencies
          ?.filter((d) => !fetched.has(d.artifactUid) && d.type !== 'content')
          .forEach((d) => nextBatch.push(d));
      }
    }

    // Deduplicate next batch and prepare for next iteration
    currentBatch = nextBatch.filter(
      (d, i, arr) => arr.findIndex((x) => x.artifactUid === d.artifactUid) === i,
    );
  }

  return result;
}

// ============ Factory Function ============

export function createProcessApiClient(
  serviceUrl: string,
  getToken: () => Promise<string>,
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
    },
  };
}
