import { handleEntityOperations } from './lib/entityServiceHandler';
import cds from '@sap/cds';

console.log("1st - Plugin loaded")


cds.on("serving", async (service : cds.Service) => {
    if (service instanceof cds.ApplicationService == false) return;
    handleEntityOperations(service);
});
