import cds, { column_expr, DeleteRequest, Target } from "@sap/cds";
import { getColumnsForProcessStart } from "./processStartHandler";
import { PROCESS_CANCEL_WHEN, PROCESS_START_WHEN, PROCESS_SUSPEND_WHEN, PROCESS_RESUME_WHEN } from "./constants";
import { getKeyFieldsForEntity } from "./handler";

export async function addDeletedEntityToRequest(target: any, req: cds.Request, areStartAnnotationsDefined: boolean) {
    let columns: column_expr[] | string[] = [];
    if(areStartAnnotationsDefined) {
        columns = await getColumnsForProcessStart(target);
    } else {
        columns = getKeyFieldsForEntity(target as cds.entity);
    }
    
    let where = (req as any).query.DELETE.from.ref[0]?.where ?? req.query.DELETE!.where;

    
    const whenAnnotations = [PROCESS_CANCEL_WHEN, PROCESS_START_WHEN, PROCESS_SUSPEND_WHEN, PROCESS_RESUME_WHEN];
    for (const annotationKey of whenAnnotations) {
        if(target[annotationKey]) {
            where = where.length ? [{xpr: where}, 'and', {xpr: target[annotationKey].xpr}] : target[annotationKey].xpr;
            break; 
        }
    }
    if (where) {
        const entities = await SELECT.one.from(req.subject).columns(columns).where(where);
        (req as DeleteRequest)._Process = entities;
    
    }
}