import * as path from 'node:path';
import * as fs from 'node:fs';
import cds from '@sap/cds';
import * as csn from '../types/csn-extensions';
import { getServiceCredentials, CachingTokenProvider, createXsuaaTokenProvider } from '../auth';
import { createProcessApiClient, IProcessApiClient, ProcessHeader, DataType } from '../api';
import { PROCESS_LOGGER_PREFIX, PROCESS_SERVICE } from '../constants';
import { buildCsnModel } from './csnBuilder';
import { isRawWorkflowJson, convertWorkflowToProcessHeader } from './rawWorkflowConverter';
import { splitAtLastDot } from './utils';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

interface ImportOptions {
  name?: string;
  file?: string;
}

/**
 * Module-level cache for data types, populated during loadProcessHeader / fetchAndSaveProcessDefinition
 * and consumed by buildCsnModel -> resolveTypeReference. Reset at the start of each importProcess call.
 * Call order: importProcess resets -> loadProcessHeader populates -> buildCsnModel reads.
 */
let dataTypeCache = new Map<string, DataType>();

export async function importProcess(
  jsonFile: string,
  options: ImportOptions = {},
): Promise<csn.CsnModel> {
  dataTypeCache = new Map();

  if (options.name) {
    const { filePath, processHeader } = await fetchAndSaveProcessDefinition(options.name);
    options.file = filePath;
    return buildCsnModel(processHeader, dataTypeCache);
  }

  const { processHeader, savedFilePath } = await loadProcessHeader(jsonFile);
  if (savedFilePath) {
    options.file = savedFilePath;
  }
  return buildCsnModel(processHeader, dataTypeCache);
}

// ============================================================================
//  Fetch process definition from SBPA
// ============================================================================

interface FetchResult {
  filePath: string;
  processHeader: ProcessHeader;
}

async function fetchAndSaveProcessDefinition(processName: string): Promise<FetchResult> {
  const [projectId, processId] = splitAtLastDot(processName);
  const apiClient = await createApiClient();

  LOG.debug('Retrieving process header...');
  const processHeader = await apiClient.fetchProcessHeader(projectId, processId);
  processHeader.projectId = projectId;

  if (processHeader.dependencies?.length) {
    LOG.debug(`Fetching ${processHeader.dependencies.length} dependent data types...`);
    processHeader.dataTypes = await apiClient.fetchAllDataTypes(
      projectId,
      processHeader.dependencies,
    );
    processHeader.dataTypes.forEach((dt) => dataTypeCache.set(dt.uid, dt));
  }

  const outputPath = path.join(cds.root, 'srv', 'workflows', `${processName}.json`);
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, JSON.stringify(processHeader, null, 2), 'utf8');

  return { filePath: outputPath, processHeader };
}

async function createApiClient(): Promise<IProcessApiClient> {
  let credentials = getServiceCredentials(PROCESS_SERVICE);

  if (!credentials) {
    // Try to resolve cloud bindings automatically (same as cds bind --exec does)
    // REVISIT: once merged in core
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cdsDk = cds as any;
      const resolve = cdsDk._localOrGlobal ?? cdsDk._local ?? require;
      const { env: bindingEnv } = resolve('@sap/cds-dk/lib/bind/shared');
      process.env.CDS_ENV ??= 'hybrid';
      cdsDk.env = cds.env.for('cds');
      Object.assign(process.env, await bindingEnv());
      cdsDk.env = cds.env.for('cds');
      credentials = getServiceCredentials(PROCESS_SERVICE);
    } catch (e) {
      LOG.debug('Auto-resolve bindings failed:', e);
    }
  }

  if (!credentials) {
    throw new Error(
      'No ProcessService credentials found. Ensure you have bound a process service instance (e.g., via cds bind process -2 <instance>).',
    );
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

// ============================================================================
//  Load process header from file
// ============================================================================

async function loadProcessHeader(
  filePath: string,
): Promise<{ processHeader: ProcessHeader; savedFilePath?: string }> {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
  const parsed = JSON.parse(content);

  let header: ProcessHeader;
  let savedFilePath: string | undefined;

  if (isRawWorkflowJson(parsed)) {
    LOG.debug('Detected raw SBPA workflow JSON format, converting to ProcessHeader...');
    header = convertWorkflowToProcessHeader(parsed);
    LOG.debug('Converted ProcessHeader:', JSON.stringify(header, null, 2));

    savedFilePath = path.join(
      cds.root,
      'srv',
      'workflows',
      `${header.projectId}.${header.identifier}.json`,
    );
    await fs.promises.mkdir(path.dirname(savedFilePath), { recursive: true });
    await fs.promises.writeFile(savedFilePath, JSON.stringify(header, null, 2), 'utf8');
  } else {
    header = parsed as ProcessHeader;
    savedFilePath = undefined;
  }

  header.dataTypes?.forEach((dt) => dataTypeCache.set(dt.uid, dt));

  return { processHeader: header, savedFilePath };
}
