import { coerceToString, fetchMissingColumns, getKeyFieldsForEntity, ValidationResult } from "./handler";

const cds = require('@sap/cds');
const { SELECT } = cds.ql; 

enum ProcessSuspendOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessSuspendSpec = {
    on?: ProcessSuspendOn,
    cascade?: string,
    predicates: string[]
}
export async function registerProcessSuspendHandler(spec: ProcessSuspendSpec, entity: typeof cds.entity, service: typeof cds.ApplicationService) {
    // to register handler, we need business Key = entity keys

    const processService = await cds.connect.to('ProcessService');
    
    const processSuspendHandler = async(row: any, cascade: boolean, request: typeof cds.Request) => { 

        let cancel = true;
        for (let predicate of spec.predicates) {
            cancel = cancel && row?.[predicate];
        };

        const keyFields = getKeyFieldsForEntity(entity);
        let businessKey = '';
        for(const keyField of keyFields) {
            businessKey += row[keyField];
         }

        if (!cancel) {
            console.log(`Not suspending process for ${entity.name} with business Key ${businessKey} as suspend condition(s) are not met`);
            return;
        }

        await processService.suspend(businessKey, cascade);
    }
    if(spec.on === ProcessSuspendOn.Update) {
        service.after(spec.on!, entity, async (results: any, request: any) => { 
            const row = await fetchMissingColumns(spec.predicates, results, request);
            processSuspendHandler(row, spec.cascade! === 'true', request); 
        });
    } else if(spec.on === ProcessSuspendOn.Delete) { 
        service.before(spec.on!, entity, async (request: any) => { 
            const row = await fetchMissingColumns(spec.predicates, request.data, request);
            processSuspendHandler(row, spec.cascade! === 'true', request);
        });

    }     
        
}


export function validateProcessSuspendSpecification(spec: ProcessSuspendSpec, entity: typeof cds.entity) : ValidationResult { 
    
    const result: ValidationResult = {
        isValid: true,
        errors: []
    }

    if (!spec.on) {
        result.isValid = false;
        result.errors!.push({
            message: `${entity.name} has no matching 'on' specifier`,
            code: '100: MISSING_ON_SPECIFIER'
        });
    }

    if(!spec.cascade) {
        result.isValid = false;
        result.errors!.push({
            message: `${entity.name} has no cascade specifier`,
            code: '200: MISSING_CASCADE_SPECIFIER'
        });
    }

    if(spec.cascade && !(spec.cascade === 'true' || spec.cascade === 'false')) {
        result.isValid = false;
        result.errors!.push({
            message: `${spec.cascade} is not a valid 'cascade' specifier and must be either 'true' or 'false'`,
            code: '201: INVALID_CASCADE_SPECIFIER'
        });
     }


    if (!Object.values(ProcessSuspendOn).includes(spec.on as ProcessSuspendOn)) {
        result.isValid = false;
        result.errors!.push({
            message: `${spec.on} is not a valid 'on' specifier and must be either 'UPDATE' or 'DELETE'`,
            code: '101: INVALID_ON_SPECIFIER'
        });
    }

    for (let predicate of spec.predicates) {
        let type = entity.elements[predicate].type;
        if (type != 'cds.Boolean') {
            result.isValid = false;
            result.errors!.push({
                message: `${predicate} is not a valid suspend predicate and must be of type 'cds.Boolean'`,
                code: '102: INVALID_PREDICATE'
            });
        }
    }


    return result;
}


export function initProcessSuspendSpecifications(entity: typeof cds.entity): ProcessSuspendSpec {
    // read annotations and detect start annotation
    const spec: ProcessSuspendSpec = { predicates: [] };

    const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith('@build'));
        for(const [key, value] of entityAnnotations) {
            switch (key) {
                case '@build.process.suspend.on':
                    spec.on = coerceToString(value, true);
                    break;
                case '@build.process.suspend.cascade':
                    spec.cascade = coerceToString(value);
                    break;
            }
        }
        if (!entity.elements) {
            return spec;
        }

        for (const [elementName, element] of Object.entries(entity.elements)) {
            const elementAnnotations = Object.entries(element as any).filter(([key]) => key.startsWith('@build'));
            for (const [key, value] of elementAnnotations) {
                
                switch (key) {
                    case '@build.process.suspend.if':
                        spec.predicates.push(elementName);
                        break;
                }
            } 
        }
        return spec;
}