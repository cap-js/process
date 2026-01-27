const cds = require('@sap/cds');

console.log("1st - Plugin loaded")

// Called after all services are loaded
cds.once("served", async () => {
    // Loop through all registered services
    for (const [serviceName, service] of Object.entries(cds.services)) {

        // Removes non application services
        if (service instanceof cds.ApplicationService == false) continue;
        console.log(`Enhancing service: ${serviceName}`);

    }
});