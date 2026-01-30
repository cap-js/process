import { coerceToString, fetchMissingColumns, getElementAnnotations, getEntityAnnotation, getEntityAnnotations, getKeyFieldsForEntity, ValidationResult } from "./handler";

import cds from '@sap/cds';

const { SELECT } = cds.ql;        


 enum ProcessStartOn {
    Create = 'CREATE',
    Update = 'UPDATE',
    Delete = 'DELETE'
}

 type ProcessStartInput = {
    sourceElement: string,
    targetVariable?: string
}

 type ProcessStartSpec = {
    id?: string,
    on?: ProcessStartOn,
    inputs: ProcessStartInput[],
    predicates: string[]
}

export async function registerProcessStartHandler(spec: ProcessStartSpec, entity: typeof cds.entity, service: typeof cds.ApplicationService) {

    
    const processService = await cds.connect.to('ProcessService');

    // TODO: Deep structures
    // TODO: Error handling


    const processStartHandler = async (row: any, request: typeof cds.Request) => {
        
        /// check start condition
        let start = true;
        for (let predicate of spec.predicates) {
            start = start && row?.[predicate];
        };

        if (!start) {
            console.log(`Not starting process for ${entity.name} with ID ${row?.ID} as start condition(s) are not met`);
            return;
        }

        const keyFields = getKeyFieldsForEntity(entity);
        let businessKey = '';
        for(const keyField of keyFields) {
            businessKey += row[keyField];
         }

        if (!spec.inputs.length) {
            await processService.start(spec.id!, {...row, 'businessKey': businessKey});
        } else {
            const payload: { [key: string]: unknown } = {}
            for (let input of spec.inputs) {
                payload[input.targetVariable ?? input.sourceElement] = row?.[input.sourceElement];
            }
            await processService.start(spec.id!, {...payload, 'businessKey': businessKey});
        }
    };

    if(spec.on === ProcessStartOn.Create || spec.on === ProcessStartOn.Update) {
        service.after(spec.on!, entity, async (results: any, request: any) => { 
            const row = await fetchMissingColumns([...spec.inputs.map(input => input.sourceElement), ...spec.predicates], results, request);
            processStartHandler(row, request); 
        });
    } else if(spec.on === ProcessStartOn.Delete) { 
        service.before(spec.on!, entity, async (request: any) => { 
            const row = await fetchMissingColumns([...spec.inputs.map(input => input.sourceElement), ...spec.predicates], request.data, request);
            processStartHandler(row, request);
        });

    } 

    
}

export function validateProcessStartSpecification(spec: ProcessStartSpec, entity: typeof cds.entity) : ValidationResult { 
    if (!spec.id) return { isValid: false }

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

    if (!Object.values(ProcessStartOn).includes(spec.on as ProcessStartOn)) {
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
                message: `${predicate} is not a valid start predicate and must be of type 'cds.Boolean'`,
                code: '102: INVALID_PREDICATE'
            });
        }
    }

    // TODO: validate inputs against types

    return result;
}

export function initProcessStartSpecifications(entity: cds.entity): ProcessStartSpec {
    // read annotations and detect start annotation
    const spec: ProcessStartSpec = { inputs: [], predicates: [] };

    const entityAnnotations = getEntityAnnotations(entity);
    for(const [key, value] of entityAnnotations) {
        switch (key) {
            case '@build.process.start.id':
                spec.id = coerceToString(value);
                break;
            case '@build.process.start.on':
                spec.on = coerceToString(value, true) as ProcessStartOn;
                break;
        }
    }
    if (!entity.elements) {
        return spec;
    }

    const elementAnnotations = getElementAnnotations(entity);
    for (const [elementName,key, value] of elementAnnotations) {
        
        switch (key) {
            case '@build.process.input':
                const input: ProcessStartInput = { sourceElement: elementName };
                input.targetVariable = coerceToString(value);
                spec.inputs.push(input);
                break;

            case '@build.process.start.if':
                spec.predicates.push(elementName);
                break;
        }
    } 
    console.log(spec);
    return spec;
}
