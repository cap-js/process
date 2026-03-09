import cds, { ServiceDefinitionAnnotation } from '@sap/cds';
import {
  BUSINESS_KEY_ALIAS,
  BUSINESS_KEY_HEADER_INFO,
  BUSINESS_KEY_HEADER_INFO_BPM,
  BUSINESS_KEY_SEMANTIC_KEY,
  BUSINESS_KEY_SEMANTIC_KEY_BPM,
  BUSINESS_KEY_SRV,
  PROCESS_LOGGER_PREFIX,
  PROCESS_START_ID,
} from '../constants';
import { CsnDefinition } from '../../types/csn-extensions';
const LOG = cds.log(PROCESS_LOGGER_PREFIX);

const PRIORITY_CHAIN: BusinessKeyAnnotationConfig[] = [
  { path: BUSINESS_KEY_HEADER_INFO_BPM },
  { path: BUSINESS_KEY_HEADER_INFO },
  { path: BUSINESS_KEY_SEMANTIC_KEY_BPM, transform: formatSemanticKey },
  { path: BUSINESS_KEY_SEMANTIC_KEY, transform: formatSemanticKey },
];

const TEMPLATE_PART_SPLITTER = /(\$\{[^}]+\})/;
const PLACEHOLDER_MATCHER = /^\$\{([^}]+)\}$/;

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

/**
 * Converts a template string with placeholders into a SQL-style
 * concatenation expression.
 *
 * @param template - A template string containing `${variable}` placeholders
 * and literal text (e.g. `"${ssn}-${age}"`).
 * @returns A SQL concatenation string where placeholders are converted to
 * column names, literals are wrapped in single quotes, parts are joined
 * with `||`, and the expression is aliased as `businessKey`
 * (e.g. `"ssn || '-' || age as businessKey"`).
 *
 * @example
 * convertTemplate("${ssn}-${age}")
 * // → "ssn || '-' || age as businessKey"
 *
 * @example
 * convertTemplate("${firstName} ${lastName}")
 * // → "firstName || ' ' || lastName as businessKey"
 */
function convertBusinessKeyToExpr(template: string): string {
  const parts = template.split(TEMPLATE_PART_SPLITTER);

  const converted = parts
    .filter((part) => part !== '')
    .map((part) => {
      const match = part.match(PLACEHOLDER_MATCHER);
      return match ? match[1] : `'${part}'`;
    });

  return converted.join(' || ') + ` ${BUSINESS_KEY_ALIAS}`;
}

export function extractBusinessKeyFromImportedProcess(
  req?: cds.Request,
  processModelDef?: CsnDefinition,
): string | undefined {
  if (!req && !processModelDef) return undefined;
  if (!processModelDef) {
    const processStartId = (req?.target as cds.entity)[PROCESS_START_ID] as string;
    const srvName = capitalizeAfterLastDot(processStartId);
    const cdsModel = cds.context?.model ?? cds.model;
    processModelDef = cdsModel?.definitions[srvName] as CsnDefinition | undefined;
  }

  // extract business key value from csn annotation
  if (processModelDef) {
    const bKey = (processModelDef as ServiceDefinitionAnnotation)[BUSINESS_KEY_SRV];
    if (!bKey) return undefined;
    const bKeyExpr = convertBusinessKeyToExpr(bKey);
    return bKeyExpr;
  }
  return undefined;
}

export function getBusinessKeyColumnOrReject(req: cds.Request, businessKey: string | undefined) {
  if (!businessKey) {
    const serviceBusinessKey = extractBusinessKeyFromImportedProcess(req);
    if (!serviceBusinessKey) {
      const msg = 'Business key is required but was not found in the entity.';
      LOG.error(msg);
      req.reject({ status: 400, message: msg });
    } else {
      return serviceBusinessKey;
    }
  } else {
    return `${businessKey} ${BUSINESS_KEY_ALIAS}`;
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
  if (!targetAnnotations) return undefined;
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
