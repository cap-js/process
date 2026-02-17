import cds, { column_expr, DeleteRequest, Target } from "@sap/cds";
import { getColumnsForProcessStart } from "./processStartHandler";
import { PROCESS_CANCEL_IF, PROCESS_START_IF, PROCESS_SUSPEND_IF, PROCESS_RESUME_IF, PROCESS_CANCEL_ON, PROCESS_START_ON, PROCESS_SUSPEND_ON, PROCESS_RESUME_ON } from "./constants";
import { getKeyFieldsForEntity } from "./handler";

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