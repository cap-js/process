import cds, { column_expr, DeleteRequest, expr, Results } from '@sap/cds';
import { BUILD_PREFIX, PROCESS_CANCEL_ON, PROCESS_RESUME_ON, PROCESS_START_ON, PROCESS_SUSPEND_ON } from '../constants';
import { getColumnsForProcessStart } from './processStart';
const { SELECT } = cds.ql; 

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
    columns?: column_expr[] | string[], 
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

export async function addDeletedEntityToRequest(target: any, req: cds.Request, areStartAnnotationsDefined: boolean) {
    let columns: column_expr[] | string[] = [];
    if(areStartAnnotationsDefined) {
        columns = await getColumnsForProcessStart(target, req);
    } else {
        columns = getKeyFieldsForEntity(target as cds.entity);
    }
    
    let where = (req as any).query.DELETE.from.ref[0]?.where ?? req.query.DELETE!.where;

    const onAnnotations = [PROCESS_CANCEL_ON, PROCESS_START_ON, PROCESS_SUSPEND_ON, PROCESS_RESUME_ON];
    let annotationIf;
    for(const annotationKey of onAnnotations) {
        if(target[annotationKey] && target[annotationKey] === 'DELETE') {
            annotationIf = target[annotationKey.replace("on", "if")];
            if(annotationIf){
                where = where.length ? [{xpr: where}, 'and', {xpr: annotationIf.xpr}] : annotationIf.xpr;
            }
        }
    }

    if (where) {
        // Safeguard: use ['*'] if columns array is empty to avoid invalid SQL
        const selectColumns = columns.length > 0 ? columns : ['*'];
        const entities = await SELECT.one.from(req.subject).columns(selectColumns).where(where);
        (req as DeleteRequest)._Process = entities;
    }
}