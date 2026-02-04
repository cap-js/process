import cds, { column_expr, expr, Results, type } from '@sap/cds';
import { BUILD_PREFIX } from './constants';
const { SELECT } = cds.ql; 

export type ValidationResult = {
    isValid: boolean;
    errors?: {
        code: string;
        message: string;
    }[];
};

export function getKeyFieldsForEntity(entity: cds.entity): string[] {
    const keys = entity.keys;
    const result: string[] = [];
    for(const key in keys) {
        result.push(key);
    }
    return result;
 }

export function concatenateBusinessKey(target: cds.entity, row: Results): string {
    let businessKey = ""
        for (const keyField of getKeyFieldsForEntity(target as cds.entity)) {
            businessKey += row[keyField]
        }
    return businessKey
}

export function coerceToString(value: string | object, toUpperCase?: boolean) : string | undefined {
    if (typeof value === 'string') {
        if(value === 'true' || value === 'false') {
            return undefined;
         }
        return toUpperCase ? value.toUpperCase() : value;
    } else if (typeof value === 'object') {
        if ('=' in value && value['='] !== undefined && value['='] !== null) {
            const equalValue = String(value['=']);
            return toUpperCase ? equalValue.toUpperCase() : equalValue;
        } else if (typeof value.toString === 'function') {
            return toUpperCase ? value.toString().toUpperCase() : value.toString();
        }
    }
    return undefined;
}


export function getEntityAnnotations(
  entity: cds.entity,
): [string, string][] {
  const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith(BUILD_PREFIX));
  return entityAnnotations;
}

export function getElementAnnotations(
  entity: cds.entity,
): [string, string, string, any][] {
    const elementAnnotations: [string, string, string, any][] = [];
    Object.entries(entity.elements)
        .forEach(([elementName, element]) => {
            Object.entries(element)
                .filter(([key]) => key.startsWith(BUILD_PREFIX))
                .forEach(([key, value]) => {
                    // for association elements: element._target.elements
                    let associatedElements;
                    if(element.type === 'cds.Association' || element.type === 'cds.Composition') {
                        
                        associatedElements = element._target;
                    }
                    elementAnnotations.push([elementName, key, String(value), associatedElements]);
                });
      });
    return elementAnnotations;
}

export async function fetchEntity(
    results: Results, 
    request: cds.Request,
    condition: expr | undefined,
    columns?: column_expr[], 
): Promise<Results | undefined> {

    if(typeof results !== 'object') {
        results = {};
    }
    
    const keyFields = getKeyFieldsForEntity((request.target) as cds.entity);
    
    // build where clause
    const where = buildWhereClause(keyFields, results, condition);
    
    const fetchedData = await 
        SELECT.one.from(request.target.name)
            .columns(columns ? columns : keyFields)
            .where(where as any);

    if(!fetchedData) {
        // condition not met
        return undefined;
    }

    return { ...fetchedData };
}

function buildWhereClause(keyFields: string[], results: Results, condition: expr | undefined) {

    const keyObject = keyFields.reduce((obj: any, keyField: string) => {
        obj[keyField] = results[keyField];
        return obj;
    }, {});

    // build where expression for object keys
    // TODO: make more efficient, especially for batch operations
    const entries = Object.entries(keyObject);
    const parts = [];
    for (const [k, v] of entries) {
        if (parts.length) parts.push("and");
        parts.push({ ref: [k] }, "=", { val: v });
    }
    
    // { ref: [ 'ID' ] }, '=', { val: '123456' }
    let where;
    if(condition !== undefined) {
        where = [{xpr: parts}, 'and', {xpr: condition}];
    } else {
        where = {xpr: parts};
    }
    return where;
}