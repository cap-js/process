import cds, { ServiceDefinitionAnnotation } from '@sap/cds';
import {
  BUSINESS_KEY_HEADER_INFO,
  BUSINESS_KEY_HEADER_INFO_BPM,
  BUSINESS_KEY_SEMANTIC_KEY,
  BUSINESS_KEY_SEMANTIC_KEY_BPM,
  BUSINESS_KEY_SRV,
  PROCESS_LOGGER_PREFIX,
  PROCESS_START_ID,
} from '../constants';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

const PRIORITY_CHAIN: BusinessKeyAnnotationConfig[] = [
  { path: BUSINESS_KEY_HEADER_INFO_BPM },
  { path: BUSINESS_KEY_HEADER_INFO },
  { path: BUSINESS_KEY_SEMANTIC_KEY_BPM, transform: formatSemanticKey },
  { path: BUSINESS_KEY_SEMANTIC_KEY, transform: formatSemanticKey },
];
type BusinessKeyAnnotationConfig = {
  path: string;
  transform?: (value: { '=': string }[]) => string | undefined;
};

function formatSemanticKey(values: { '=': string }[]): string | undefined {
  let result = undefined;
  for (const value of values) {
    if (!result) {
      result = value['='];
    } else {
      result = result + ' || ' + value['='];
    }
  }
  return result;
}

function capitalizeAfterLastDot(input: string): string {
  const lastDotIndex = input.lastIndexOf('.');
  if (lastDotIndex === -1) return input + 'Service';

  const beforeLastDot = input.slice(0, lastDotIndex + 1);
  const afterLastDot = input.slice(lastDotIndex + 1);

  return beforeLastDot + afterLastDot.charAt(0).toUpperCase() + afterLastDot.slice(1) + 'Service';
}

function convertBusinessKeyToExpr(template: string): string {
  const parts = template.split(/(\$\{[^}]+\})/);

  const converted = parts
    .filter((part) => part !== '')
    .map((part) => {
      const match = part.match(/^\$\{([^}]+)\}$/);
      return match ? match[1] : `'${part}'`;
    });

  return converted.join(' || ') + ' as businessKey';
}

async function extractBusinessKeyFromImportedProcess(
  req: cds.Request,
): Promise<string | undefined> {
  // get process start id
  const processStartId = (req.target as cds.entity)[PROCESS_START_ID] as string;
  // get process csn for id
  const srvName = capitalizeAfterLastDot(processStartId);
  const models = await cds.load(`srv/external/${processStartId}.cds`);
  // extract business key value from csn annotation
  const srvCsn = models.definitions?.[srvName] as ServiceDefinitionAnnotation;
  if (srvCsn) {
    const bKey = srvCsn[BUSINESS_KEY_SRV];
    const bKeyExpr = convertBusinessKeyToExpr(bKey);
    return bKeyExpr;
  }
  return undefined;
}

export async function getBusinessKeyColumnOrReject(
  req: cds.Request,
  businessKey: string | undefined,
) {
  if (!businessKey) {
    const serviceBusinessKey = await extractBusinessKeyFromImportedProcess(req);
    if (!serviceBusinessKey) {
      const msg = 'Business key is required but was not found in the entity.';
      LOG.error(msg);
      req.reject({ status: 400, message: msg });
    } else {
      return serviceBusinessKey;
    }
  } else {
    return `${businessKey} as businessKey`;
  }
}

/**
 * Hierarchy:
 *
 *  1: '@UI.HeaderInfo#bpm.Title.Value'
 *
 *  2: '@UI.HeaderInfo.Title.Value'
 *
 *  3: '@Common.SemanticKey#bpm'
 *
 *  4: '@Common.SemanticKey'
 */
export function retrieveBusinessKeyExpression(targetAnnotations: cds.entity) {
  for (const { path, transform } of PRIORITY_CHAIN) {
    const value = targetAnnotations[path];
    if (value === undefined) continue;
    if (transform) {
      return transform(value as { '=': string }[]);
    } else {
      return (value as { '=': string })?.['='];
    }
  }
  return undefined;
}
