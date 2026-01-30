import cds from '@sap/cds';
import { initProcessCancelSpecifications, registerProcessCancelHandler, validateProcessCancelSpecification } from './processCancelHandler';
import { initProcessStartSpecifications, validateProcessStartSpecification, registerProcessStartHandler } from './processStartHandler';

export function handleEntityOperations(service: cds.ApplicationService) {
    console.log(`Handling entity operations for service: ${service.name}`);
    for (const entity of service.entities) {
        // read annotations and detect start annotation
        handleProcessStartHandler(entity, service);

        handleProcessCancelHandler(entity, service);
    }
}

function handleProcessCancelHandler(entity: typeof cds.entity, service: typeof cds.ApplicationService) {

    const processCancelSpec = initProcessCancelSpecifications(entity);
    
    if(processCancelSpec?.on) {
        // annotation found, complete or incomplete not relevant here 
        const validationResult = validateProcessCancelSpecification(processCancelSpec, entity);

        if(validationResult.isValid) {

            console.log(`  - Registering process cancel handler for entity: ${entity.name}`);
            registerProcessCancelHandler(processCancelSpec,  entity, service);

        } else {

            for(const error of validationResult.errors || []) {
                console.log(`  - Error [${error.code}]: ${error.message}`);
            }
        }

    }

 }

function handleProcessStartHandler(entity: typeof cds.entity, service: typeof cds.ApplicationService) {
    
    const processStartSpec = initProcessStartSpecifications(entity);

    if(processStartSpec?.id || processStartSpec?.on) {
        // annotation found, complete or incomplete not relevant here

        const validationResult = validateProcessStartSpecification(processStartSpec, entity);

        if(validationResult.isValid) {

            console.log(`  - Registering process start handler for process ID: ${processStartSpec.id}`);
            registerProcessStartHandler(processStartSpec, entity, service);

        } else {

            for(const error of validationResult.errors || []) {
                console.log(`  - Error [${error.code}]: ${error.message}`);
            }
            
        }
    }
}

