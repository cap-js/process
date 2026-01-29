import { handleEntityOperations } from './lib/entityServiceHandler';
const cds = require('@sap/cds');

console.log("1st - Plugin loaded")


cds.on("serving", (service: typeof cds.ApplicationService) => {
     console.log("Processing service: " + service.name);
        if (service instanceof cds.ApplicationService == false) return;
        
        handleEntityOperations(service);
})