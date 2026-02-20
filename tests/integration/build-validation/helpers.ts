import cds from '@sap/cds';
import { ProcessValidationPlugin } from '../../../lib/build/plugin';

/**
 * Severity constants matching cds.build.Plugin
 * These values must match what jest-setup.js defines
 */
const SEVERITY = {
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
} as const;

/**
 * Map numeric severity to string names
 */
const SEVERITY_MAP: Record<number, 'ERROR' | 'WARNING' | 'INFO'> = {
  [SEVERITY.ERROR]: 'ERROR',
  [SEVERITY.WARNING]: 'WARNING',
  [SEVERITY.INFO]: 'INFO',
};

export interface ValidationMessage {
  msg: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

export interface ValidationResult {
  messages: ValidationMessage[];
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  buildSucceeded: boolean;
  buildError?: Error;
}

/**
 * Compiles a CDS model and runs the ProcessValidationPlugin against it.
 * This directly invokes the plugin's build method with a mocked interface,
 * allowing us to test validation logic without running the full cds build pipeline.
 *
 * Note: Requires jest-setup.js to have set up the cds.build mock before this runs.
 */
export async function validateModel(cdsSource: string): Promise<ValidationResult> {
  // Compile the CDS source to CSN model
  const model = await cds.compile.to.csn(cdsSource);

  const messages: ValidationMessage[] = [];
  const pluginMessages: Array<{ message: string; severity: number }> = [];

  // Create a plugin instance using Object.create to access prototype methods
  // We mock the required interface methods that the plugin uses
  const plugin = Object.create(ProcessValidationPlugin.prototype) as ProcessValidationPlugin & {
    messages: typeof pluginMessages;
    model: () => Promise<any>;
    pushMessage: (msg: string, severity: number | undefined) => void;
  };

  // Mock the messages array that the plugin uses to collect validation results
  plugin.messages = pluginMessages;

  // Mock the model() method that returns the compiled CSN
  // Use 'any' to avoid type conflicts between cds.csn.CSN and internal CsnModel types
  plugin.model = () => Promise.resolve(model) as Promise<any>;

  // Mock pushMessage to capture validation output
  plugin.pushMessage = (msg: string, severity: number | undefined) => {
    const severityName = severity !== undefined ? SEVERITY_MAP[severity] || 'INFO' : 'INFO';
    messages.push({ msg, severity: severityName });
    pluginMessages.push({ message: msg, severity: severity ?? SEVERITY.INFO });
  };

  let buildSucceeded = true;
  let buildError: Error | undefined;

  try {
    // Run the validation by calling the plugin's build method
    await plugin.build();
  } catch (err) {
    buildSucceeded = false;
    buildError = err as Error;
  }

  return {
    messages,
    errors: messages.filter((m) => m.severity === 'ERROR'),
    warnings: messages.filter((m) => m.severity === 'WARNING'),
    buildSucceeded,
    buildError,
  };
}

/**
 * Creates a minimal CDS model with the given entity definition inside a service.
 * Useful for quickly testing entity-level annotations.
 */
export function wrapEntity(entityDef: string, serviceName = 'TestService'): string {
  return `service ${serviceName} { ${entityDef} }`;
}

/**
 * Creates a CDS model with a process definition for input validation tests.
 *
 * The process definition needs:
 * 1. An entity with @build.process annotation pointing to the process ID
 * 2. A nested type named ProcessInputs containing the input fields
 *
 * The validation code looks for `${processDef.name}.ProcessInputs`
 */
export function withProcessDefinition(
  entityDef: string,
  processDefName: string,
  processInputs: string,
  otherTypes?: string,
): string {
  return `
    // Process definition entity with nested ProcessInputs type
    @build.process: '${processDefName}'
    service ${processDefName}Service {
      
      // Process inputs type - must be named {EntityName}.ProcessInputs
      type ProcessInputs {
        ${processInputs}
      }
      ${otherTypes || ''}
    }
    
    service TestService { 
      ${entityDef}
    }
  `;
}
