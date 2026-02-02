import cds, { Results } from '@sap/cds';
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
  const entityAnnotations = Object.entries(entity).filter(([key]) => key.startsWith('@build'));
  return entityAnnotations;
}

export function getElementAnnotations(
  entity: cds.entity,
): [string, string, string][] {
    const elementAnnotations: [string, string, string][] = [];
    Object.entries(entity.elements)
        .forEach(([elementName, element]) => {
            Object.entries(element)
                .filter(([key]) => key.startsWith('@build'))
                .forEach(([key, value]) => {
                    elementAnnotations.push([elementName, key, String(value)]);
                });
      });
    return elementAnnotations;
}

export async function fetchMissingColumns(
    requiredColumns: string[], 
    results: Results, 
    request: cds.Request
): Promise<Results> {
    const tx = cds.transaction(request);

    if(typeof results !== 'object') {
        results = {};
    }

    const missingColumns = requiredColumns.filter(column => 
        !(column in results) || results[column] === undefined
    );

    if (missingColumns.length === 0) {
        return results;
    }
    
    const keyFields = getKeyFieldsForEntity((request.target) as cds.entity);
    


    // Create object with only key fields and their values
    const keyObject = keyFields.reduce((obj: any, keyField: string) => {
        obj[keyField] = results[keyField];
        return obj;
    }, {});

    const columns = [...missingColumns, ...keyFields];
    
    const fetchedData = await tx.run(
        // request.target.name = TestService.AnnotatedShipments
        SELECT.one.from(request.target.name)
            .columns(columns)
            .where(keyObject)
    );
    

    return { ...results, ...fetchedData };
}

export function isPredicateConditionMet(predicates: string[], row: Results): boolean {
  let start = true
  for (let predicate of predicates) {
    start = start && row?.[predicate]
  }
  return start
}