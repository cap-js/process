import cds, { column_expr, DeleteRequest, Target } from "@sap/cds";
import { getColumnsForProcessStart } from "./processStartHandler";
import { PROCESS_CANCEL_WHEN, PROCESS_START_WHEN, PROCESS_SUSPEND_WHEN, PROCESS_RESUME_WHEN } from "./constants";


// TODO: handle entities without input annotations, need to discuss whether that makes sense
export async function addDeletedEntityToRequest(target: any, req: cds.Request, areStartAnnotationsDefined: boolean) {
    let columns: column_expr[] | undefined = undefined;
    if(areStartAnnotationsDefined) {
        columns = await getColumnsForProcessStart(target);
    }
    
    let where = (req as any).query.DELETE.from.ref[0]?.where ?? req.query.DELETE!.where;

    
    const whenAnnotations = [PROCESS_CANCEL_WHEN, PROCESS_START_WHEN, PROCESS_SUSPEND_WHEN, PROCESS_RESUME_WHEN];
    for (const annotationKey of whenAnnotations) {
        if(target[annotationKey]) {
            where = where.length ? [{xpr: where}, 'and', {xpr: target[annotationKey].xpr}] : target[annotationKey].xpr;
            break; 
        }
    }

    if (target.elements.ID && where) {
    // enhance by only fetching columns that are required
    if(columns !== undefined) {
        const entities = await SELECT.one.from(req.subject).columns(columns).where(where);
        (req as DeleteRequest)._Process = entities;

    } else {
        const entities = await SELECT.from(req.subject).where(where);
        (req as DeleteRequest)._Process = entities;
    }

    }
}