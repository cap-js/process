import { handleEntityOperations } from './lib/entityServiceHandler';
const cds = require('@sap/cds');

console.log("1st - Plugin loaded")


cds.on("serve", async (service : typeof cds.Service) => {

    console.log("Processing service: " + service.name);
    if (service instanceof cds.ApplicationService == false) return;
    
    handleEntityOperations(service);
});