const cds = require('@sap/cds');


export function handleEntityOperations(service: typeof cds.ApplicationService) {
    for (const entity of service.entities) {
        // Push new Start Handler for each entity
        // handlers.push()
    }
}
