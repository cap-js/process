using {sap.capire.bookshop as my} from '../db/shipment';

service LifecycleAnnotationService {

    // ============================================
    // COMBINATION ENTITIES - Real-world scenarios
    // ============================================

    // --------------------------------------------
    // Scenario 1: Basic Workflow Lifecycle
    // Start process on CREATE, Cancel on DELETE
    // Use case: Order processing, ticket management
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process',
        on: 'CREATE',
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (ID)
    entity BasicLifecycle             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 2: Status-based Cancellation
    // Start on CREATE, Cancel on UPDATE when mileage exceeds threshold
    // Use case: Auto-cancel workflow when entity reaches terminal state
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process',
        on: 'CREATE',
    }
    @bpm.process.cancel     : {
        on: 'UPDATE',
        if: (mileage > 1000),
    }
    @bpm.process.businessKey: (ID)
    entity StatusBasedCancel          as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 3: Suspend/Resume Workflow
    // Start on CREATE, Suspend on UPDATE (if mileage > 500),
    // Resume on UPDATE (if mileage <= 500)
    // Use case: Pause processing when item is on hold
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process',
        on: 'CREATE',
    }
    @bpm.process.suspend    : {
        on: 'UPDATE',
        if: (mileage > 500),
    }
    @bpm.process.resume     : {
        on: 'UPDATE',
        if: (mileage <= 500),
    }
    @bpm.process.businessKey: (ID)
    entity SuspendResumeWorkflow      as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 4: Full Lifecycle Management
    // Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE
    // Use case: Complete workflow control with pause capability
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process',
        on: 'CREATE',
    }
    @bpm.process.suspend    : {
        on: 'UPDATE',
        if: (mileage > 800),
    }
    @bpm.process.resume     : {
        on: 'UPDATE',
        if: (mileage <= 800),
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true
    }
    @bpm.process.businessKey: (ID)
    entity FullLifecycle              as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 5: Conditional Start and Cancel
    // Start on UPDATE when condition met, Cancel on UPDATE when different condition
    // Use case: Workflow triggered by status change, cancelled by another status
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'eu12.cdsmunich.capprocesspluginhybridtest.lifecycle_Test_Process',
        on: 'UPDATE',
        if: (mileage > 500)
    }
    @bpm.process.cancel     : {
        on: 'UPDATE',
        if: (mileage > 1500),
    }
    @bpm.process.businessKey: (ID)
    entity ConditionalStartCancel     as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 6: External Workflow Management
    // No start annotation - workflow started externally
    // Suspend/Resume on UPDATE, Cancel on DELETE
    // Use case: Entity linked to externally triggered workflow
    // --------------------------------------------
    @bpm.process.suspend    : {
        on: 'UPDATE',
        if: (mileage > 500),
    }
    @bpm.process.resume     : {
        on: 'UPDATE',
        if: (mileage <= 500),
    }
    @bpm.process.cancel     : {on: 'DELETE', }
    @bpm.process.businessKey: (ID)
    entity ExternalWorkflowManagement as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

}
