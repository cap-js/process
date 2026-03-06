import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import { getServiceCredentials, CachingTokenProvider, createXsuaaTokenProvider } from '../auth';
import { createProcessApiClient, IProcessApiClient, ProcessHeader } from '../api';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from '../constants';
import { setDataTypeInCache } from './types';
import { splitAtLastDot, capitalize } from './utils';
import { addServiceToPackageJson } from './package-json';
import { validateAndLogBusinessKey } from './business-key-validator';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

export interface FetchResult {
  filePath: string;
  processHeader: ProcessHeader;
}

export async function fetchAndSaveProcessDefinition(processName: string): Promise<FetchResult> {
  const [projectId, processId] = splitAtLastDot(processName);
  const apiClient = await createApiClient();

  LOG.debug('Retrieving process header...');
  const processHeader = await apiClient.fetchProcessHeader(projectId, processId);
  processHeader.projectId = projectId;
  processHeader.businessKey = await apiClient.fetchBusinessKey(projectId, processId);
  if (!processHeader.businessKey) {
    LOG.warn(`Process ${processName} has no business key defined.`);
  }

  validateAndLogBusinessKey(processHeader.businessKey);

  if (processHeader.dependencies?.length) {
    LOG.debug(`Fetching ${processHeader.dependencies.length} dependent data types...`);
    processHeader.dataTypes = await apiClient.fetchAllDataTypes(
      projectId,
      processHeader.dependencies,
    );
    processHeader.dataTypes.forEach((dt) => setDataTypeInCache(dt.uid, dt));
  }

  const outputPath = path.join(cds.root, 'workflows', `${processName}.json`);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, JSON.stringify(processHeader, null, 2), 'utf8');

  const serviceName = `${projectId}.${capitalize(processHeader.identifier)}Service`;
  await addServiceToPackageJson(serviceName, `srv/external/${processName}`);

  return { filePath: outputPath, processHeader };
}

async function createApiClient(): Promise<IProcessApiClient> {
  const credentials = getServiceCredentials(PROCESS_SERVICE);
  if (!credentials) {
    throw new Error('No ProcessService credentials found. Run with: cds bind --exec -- ...');
  }

  const apiUrl = credentials.endpoints?.api;
  if (!apiUrl) {
    throw new Error('No API URL found in ProcessService credentials.');
  }

  LOG.debug('Creating API client...');
  const tokenProvider = createXsuaaTokenProvider(credentials);
  const cachingTokenProvider = new CachingTokenProvider(tokenProvider);

  return createProcessApiClient(apiUrl, () => cachingTokenProvider.getToken());
}
