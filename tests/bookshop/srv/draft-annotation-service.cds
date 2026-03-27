using {sap.capire.bookshop as my} from '../db/shipment';

service DraftAnnotationService {

    // ============================================
    // Isolated draft entities for START annotation tests
    // ============================================

    // Start on CREATE without when condition (draft-enabled)
    @bpm.process.start: {
        id: 'draftStartOnCreateProcess',
        on: 'CREATE',
    }
    @odata.draft.enabled
    entity DraftStartOnCreate             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on DELETE without when condition (draft-enabled)
    @bpm.process.start: {
        id: 'draftStartOnDeleteProcess',
        on: 'DELETE',
    }
    @odata.draft.enabled
    entity DraftStartOnDelete             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated draft entities for CANCEL annotation tests
    // ============================================

    // Cancel on CREATE with if condition (draft-enabled)
    @bpm.process.cancel     : {
        on     : 'CREATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    @odata.draft.enabled
    entity DraftCancelOnCreateWhen        as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on UPDATE without when condition (draft-enabled)
    @bpm.process.cancel     : {
        on     : 'UPDATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    @odata.draft.enabled
    entity DraftCancelOnUpdate            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on DELETE without when condition (draft-enabled)
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    @odata.draft.enabled
    entity DraftCancelOnDelete            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated draft entities for SUSPEND annotation tests
    // ============================================

    // Suspend on CREATE without when condition (draft-enabled)
    @bpm.process.suspend    : {
        on     : 'CREATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    @odata.draft.enabled
    entity DraftSuspendOnCreate           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated draft entities for RESUME annotation tests
    // ============================================

    // Resume on CREATE without when condition (draft-enabled)
    @bpm.process.resume     : {
        on     : 'CREATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    @odata.draft.enabled
    entity DraftResumeOnCreate            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // DRAFT LIFECYCLE COMBINATION SCENARIOS
    // ============================================

    // Full Lifecycle with draft: Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE
    @bpm.process.start      : {
        id: 'draftLifecycleProcess',
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
    @odata.draft.enabled
    entity DraftFullLifecycle {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

}
