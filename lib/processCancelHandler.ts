import { coerceToString, getKeyFieldsForEntity, ValidationResult } from "./handler";

const cds = require('@sap/cds');
const { SELECT } = cds.ql; 

enum ProcessCancelOn {
    Update = 'UPDATE',
    Delete = 'DELETE',
}

type ProcessCancelSpec = {
    on?: ProcessCancelOn,
    cascade?: string,
    predicates: string[]
}

export async function registerProcessCancelHandler(spec: ProcessCancelSpec, entity: typeof cds.entity, service: typeof cds.ApplicationService) {
    // to register handler, we need business Key = entity keys

    const processService = await cds.connect.to('ProcessService');
    
    const processCancelHandler = async(row: any, cascade: boolean, request: typeof cds.Request) => { 

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
            console.log(`Not cancelling process for ${entity.name} with business Key ${businessKey} as cancel condition(s) are not met`);
            return;
        }

        await processService.cancel(businessKey, cascade);
    }

    if(spec.on === ProcessCancelOn.Update) {
        service.after(spec.on!, entity, async (results: any, request: any) => { 
            const row = await fetchMissingColumns(spec, results, request);
            processCancelHandler(row, spec.cascade! === 'true', request); 
        });
    } else if(spec.on === ProcessCancelOn.Delete) { 
        service.before(spec.on!, entity, async (request: any) => { 
            const row = await fetchMissingColumns(spec, request.data, request);
            processCancelHandler(row, spec.cascade! === 'true', request);
        });

    } 
        
        
}

export function validateProcessCancelSpecification(spec: ProcessCancelSpec, entity: typeof cds.entity) : ValidationResult { 
    
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


    if (!Object.values(ProcessCancelOn).includes(spec.on as ProcessCancelOn)) {
        result.isValid = false;
        result.errors!.push({
            message: `${spec.on} is not a valid 'on' specifier and must be either 'CREATE', 'UPDATE', or 'DELETE'`,
            code: '101: INVALID_ON_SPECIFIER'
        });
    }

    for (let predicate of spec.predicates) {
        let type = entity.elements[predicate].type;
        if (type != 'cds.Boolean') {
            result.isValid = false;
            result.errors!.push({
                message: `${predicate} is not a valid cancel predicate and must be of type 'cds.Boolean'`,
                code: '102: INVALID_PREDICATE'
            });
        }
    }


    return result;
}


export function initProcessCancelSpecifications(entity: typeof cds.entity): ProcessCancelSpec {
    // read annotations and detect start annotation
    const spec: ProcessCancelSpec = { predicates: [] };

    const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith('@build'));
        for(const [key, value] of entityAnnotations) {
            switch (key) {
                case '@build.process.cancel.on':
                    spec.on = coerceToString(value, true);
                    break;
                case '@build.process.cancel.cascade':
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
                    case '@build.process.cancel.if':
                        spec.predicates.push(elementName);
                        break;
                }
            } 
        }
        return spec;
}

async function fetchMissingColumns(spec: ProcessCancelSpec, results: any, request: any) {
        
        const tx = cds.transaction(request);
        
        const missingPredicates = spec.predicates.filter(predicate => 
            !(predicate in results) || results[predicate] === undefined
        );
        
        const missingColumns = [
            ...missingPredicates
        ];

        const keyFields = getKeyFieldsForEntity(request.target);

        // Create object with only key fields and their values
        const keyObject = keyFields.reduce((obj: any, keyField: string) => {
            obj[keyField] = results[keyField];
            return obj;
        }, {});

        
        // fetch missing columns
        let row = results;
        if (missingColumns.length > 0) {
            const fetchedData = await tx.run(
                SELECT.one.from(request.target.name)
                    .columns(...missingColumns)
                    .where(keyObject)
            );
            row = { ...results, ...fetchedData };
        }
        return row;
}
