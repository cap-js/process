import cds from '@sap/cds';
import { PROCESS_LOGGER_PREFIX } from '../constants';

const LOG = cds.log(PROCESS_LOGGER_PREFIX);

enum ValidationState {
  START,
  PRE_STEP,
  CONST,
  VAR,
  START_VAR_NAME,
  VAR_NAME,
  PARSED_VAR_NAME,
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Business Key Grammar (Type 2 - Context-Free Grammar)
 *
 * TERMINALS:
 *
 * SPECIAL      = '$' | '{' | '}'
 * CHAR         = <any character except SPECIAL>
 * CONST_CHAR   = <CHAR> | '{' | '}'
 * IDENT_START  = 'a'-'z' | 'A'-'Z' | '_'
 * IDENT_CHAR   = IDENT_START | '0'-'9'
 *
 * PRODUCTIONS:
 *
 * START           = "$" <PRE_STEP> | <CONST>
 * PRE_STEP        = "{" <VAR> | <CONST> | "$" <PRE_STEP>
 * CONST           = <CONST_CHAR> <CONST> | <CONST_CHAR> | "$" <PRE_STEP>
 * VAR             = "context.startEvent." <START_VAR_NAME>
 * START_VAR_NAME  = <IDENT_START> <VAR_NAME>
 * VAR_NAME        = <IDENT_CHAR> <VAR_NAME> | "." <START_VAR_NAME> | "}" <PARSED_VAR_NAME> | "}"
 * PARSED_VAR_NAME = "$" <PRE_STEP> | <CONST>
 *
 * Valid Examples:
 *   - "ORD-${context.startEvent.orderId}"
 *   - "${context.startEvent.customer.address.city}"
 *   - "PREFIX_${context.startEvent.id}_SUFFIX"
 *   - "PRICE$100"
 *   - "${context.startEvent.ssn} -${context.startEvent.age}"
 */

const CONTEXT_START_EVENT = 'context.startEvent.';

/**
 * Validates a business key against the grammar.
 * Business keys can contain literal text and variable references in the format:
 * ${context.startEvent.<propertyPath>}
 *
 * @param businessKey The business key to validate
 * @returns ValidationResult with isValid flag and optional error message
 */
export function validateBusinessKey(businessKey: string | undefined): ValidationResult {
  if (!businessKey) {
    return { isValid: true };
  }

  let validationState: ValidationState = ValidationState.START;
  let indexOfContextStartEvent = 0;
  let varStartIndex = -1;

  for (let i = 0; i < businessKey.length; i++) {
    const c = businessKey[i];
    switch (validationState) {
      case ValidationState.START:
        if (c === '$') {
          validationState = ValidationState.PRE_STEP;
          continue;
        }
        validationState = ValidationState.CONST;
        continue;

      case ValidationState.PRE_STEP:
        if (c === '{') {
          varStartIndex = i - 1; // Position of '$'
          validationState = ValidationState.VAR;
          continue;
        }
        if (c === '$') {
          continue;
        }
        validationState = ValidationState.CONST;
        continue;

      case ValidationState.CONST:
        if (c === '$') {
          validationState = ValidationState.PRE_STEP;
          continue;
        }
        continue;

      case ValidationState.VAR: {
        if (c === CONTEXT_START_EVENT[indexOfContextStartEvent]) {
          indexOfContextStartEvent++;
          if (indexOfContextStartEvent === CONTEXT_START_EVENT.length) {
            validationState = ValidationState.START_VAR_NAME;
            indexOfContextStartEvent = 0;
            continue;
          }
          continue;
        }

        const { value: invalidVar, isComplete } = extractInvalidVariable(
          businessKey,
          varStartIndex,
        );
        indexOfContextStartEvent = 0;

        if (isComplete) {
          return {
            isValid: false,
            error: `'${invalidVar}' does not match expected format '\${context.startEvent.<propertyPath>}'`,
          };
        } else {
          return {
            isValid: false,
            error: `'${invalidVar}' is incomplete and does not match expected format '\${context.startEvent.<propertyPath>}'`,
          };
        }
      }

      case ValidationState.START_VAR_NAME: {
        if (isIdentStart(c)) {
          validationState = ValidationState.VAR_NAME;
          continue;
        }

        const { value: invalidVar, isComplete } = extractInvalidVariable(
          businessKey,
          varStartIndex,
        );

        if (c === '}') {
          return {
            isValid: false,
            error: `'${invalidVar}' is missing property name, expected format '\${context.startEvent.<propertyPath>}'`,
          };
        } else if (!isComplete) {
          return {
            isValid: false,
            error: `'${invalidVar}' is incomplete, expected format '\${context.startEvent.<propertyPath>}'`,
          };
        } else {
          return {
            isValid: false,
            error: `'${invalidVar}' has invalid property name starting with '${c}', expected format '\${context.startEvent.<propertyPath>}'`,
          };
        }
      }

      case ValidationState.VAR_NAME: {
        if (isIdentChar(c)) {
          continue;
        }
        if (c === '.') {
          validationState = ValidationState.START_VAR_NAME;
          continue;
        }
        if (c === '}') {
          varStartIndex = -1; // Reset for next variable
          validationState = ValidationState.PARSED_VAR_NAME;
          continue;
        }

        const { value: invalidVar } = extractInvalidVariable(businessKey, varStartIndex);

        return {
          isValid: false,
          error: `'${invalidVar}' contains invalid character '${c}', expected format '\${context.startEvent.<propertyPath>}'`,
        };
      }

      case ValidationState.PARSED_VAR_NAME:
        if (c === '$') {
          validationState = ValidationState.PRE_STEP;
          continue;
        }
        validationState = ValidationState.CONST;
        continue;
    }
  }

  switch (validationState) {
    case ValidationState.START:
    case ValidationState.CONST:
    case ValidationState.PARSED_VAR_NAME:
      return { isValid: true };

    case ValidationState.PRE_STEP:
      return {
        isValid: false,
        error: `Trailing '$' without variable reference`,
      };

    case ValidationState.VAR:
    case ValidationState.START_VAR_NAME:
    case ValidationState.VAR_NAME: {
      const { value: invalidVar } = extractInvalidVariable(businessKey, varStartIndex);
      return {
        isValid: false,
        error: `'${invalidVar}' is incomplete, missing closing '}'`,
      };
    }
  }
}

/**
 * Validates a business key and logs an error if invalid.
 * This is the main entry point for validation during import.
 *
 * @param businessKey The business key to validate
 * @returns The original business key (for chaining)
 */
export function validateAndLogBusinessKey(businessKey: string | undefined) {
  if (!businessKey) {
    return;
  }

  const result = validateBusinessKey(businessKey);
  if (!result.isValid) {
    LOG.warn(`Invalid business key: ${result.error}`);
  }
}

function extractInvalidVariable(
  businessKey: string,
  startIndex: number,
): { value: string; isComplete: boolean } {
  const endIndex = businessKey.indexOf('}', startIndex);

  if (endIndex === -1) {
    return {
      value: businessKey.substring(startIndex),
      isComplete: false,
    };
  } else {
    return {
      value: businessKey.substring(startIndex, endIndex + 1),
      isComplete: true,
    };
  }
}

function isIdentStart(c: string): boolean {
  return /^[a-zA-Z_]$/.test(c);
}

function isIdentChar(c: string): boolean {
  return /^[a-zA-Z0-9_]$/.test(c);
}
