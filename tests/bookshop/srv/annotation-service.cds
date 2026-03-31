using {sap.capire.bookshop as my} from '../db/shipment';

service AnnotationService {

    @bpm.process.start: {
        id: 'shipmentProcess',
        on: 'CREATE',
    }
    entity Shipments                     as
        projection on my.Shipments {
            ID,
            status,
            shipmentDate,
            expectedDelivery,
            origin,
            destination,
            items : Composition of many ShipmentItems
                        on items.shipment = $self,
            totalValue,
        }

    entity ShipmentItems                 as
        projection on my.ShipmentItems {
            ID,
            shipment : Association to Shipments
                           on shipment.ID = $self.shipment.ID,
            title,
            quantity,
            price,
            weight,
        }

    @bpm.process.start: {
        id    : 'shipmentProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.shipmentDate,
            {
                path: $self.origin,
                as  : 'OriginCountry'
            },
            $self.items
        ]
    }
    entity InputShipments {
        key ID               : UUID;
            status           : String(20) default 'PENDING';
            shipmentDate     : Date;
            expectedDelivery : Date;
            origin           : String(200);
            destination      : String(200);
            items            : Composition of many InputShipmentItems
                                   on items.shipment = $self;
    }


    entity InputShipmentItems {
        key ID         : UUID;
            shipment   : Association to InputShipments
                             on shipment.ID = $self.shipmentID;
            shipmentID : UUID;
            title      : String(200);
            quantity   : Integer;
            price      : Decimal(15, 2);
    }

    @bpm.process.start      : {
        id: 'carProcess',
        on: 'CREATE',
        if: (mileage > 1000)
    }
    @bpm.process.cancel     : {
        on     : 'UPDATE',
        cascade: false,
        if     : (mileage > 1000),
    }
    @bpm.process.businessKey: (ID)
    entity CarWhen                       as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    @bpm.process.start: {
        id: 'carProcess',
        on: 'DELETE',
    }
    entity CarOnDel                      as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated entities for START annotation tests
    // ============================================

    // Start on CREATE without when condition
    @bpm.process.start: {
        id: 'startOnCreateProcess',
        on: 'CREATE',
    }
    entity StartOnCreate                 as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on CREATE with if condition
    @bpm.process.start: {
        id: 'startOnCreateWhenProcess',
        on: 'CREATE',
        if: (mileage > 500)
    }
    entity StartOnCreateWhen             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on UPDATE without when condition
    @bpm.process.start: {
        id: 'startOnUpdateProcess',
        on: 'UPDATE',
    }
    entity StartOnUpdate                 as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on UPDATE with if condition
    @bpm.process.start: {
        id: 'startOnUpdateWhenProcess',
        on: 'UPDATE',
        if: (mileage > 500)
    }
    entity StartOnUpdateWhen             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on DELETE without when condition
    @bpm.process.start: {
        id: 'startOnDeleteProcess',
        on: 'DELETE',
    }
    entity StartOnDelete                 as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on DELETE with if condition
    @bpm.process.start: {
        id: 'startOnDeleteWhenProcess',
        on: 'DELETE',
        if: (mileage > 500)
    }
    entity StartOnDeleteWhen             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated entities for CANCEL annotation tests
    // ============================================

    // Cancel on CREATE without when condition
    @bpm.process.cancel     : {
        on     : 'CREATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnCreate                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on CREATE with if condition
    @bpm.process.cancel     : {
        on     : 'CREATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnCreateWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on UPDATE without when condition
    @bpm.process.cancel     : {
        on     : 'UPDATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnUpdate                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on UPDATE with if condition
    @bpm.process.cancel     : {
        on     : 'UPDATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnUpdateWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on DELETE without when condition
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnDelete                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on DELETE with if condition
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnDeleteWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated entities for SUSPEND annotation tests
    // ============================================

    // Suspend on CREATE without when condition
    @bpm.process.suspend    : {
        on     : 'CREATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnCreate               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on CREATE with if condition
    @bpm.process.suspend    : {
        on     : 'CREATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnCreateWhen           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on UPDATE without when condition
    @bpm.process.suspend    : {
        on     : 'UPDATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnUpdate               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on UPDATE with if condition
    @bpm.process.suspend    : {
        on     : 'UPDATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnUpdateWhen           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on DELETE without when condition
    @bpm.process.suspend    : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnDelete               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on DELETE with if condition
    @bpm.process.suspend    : {
        on     : 'DELETE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnDeleteWhen           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // Isolated entities for RESUME annotation tests
    // ============================================

    // Resume on CREATE without when condition
    @bpm.process.resume     : {
        on     : 'CREATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnCreate                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on CREATE with if condition
    @bpm.process.resume     : {
        on     : 'CREATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnCreateWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on UPDATE without when condition
    @bpm.process.resume     : {
        on     : 'UPDATE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnUpdate                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on UPDATE with if condition
    @bpm.process.resume     : {
        on     : 'UPDATE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnUpdateWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on DELETE without when condition
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnDelete                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on DELETE with if condition
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnDeleteWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // DEFAULT CASCADE TESTS (cascade omitted, should default to false)
    // ============================================

    // Cancel on CREATE without cascade (should default to false)
    @bpm.process.cancel     : {on: 'CREATE'}
    @bpm.process.businessKey: (ID)
    entity CancelOnCreateDefaultCascade  as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on UPDATE without cascade (should default to false)
    @bpm.process.cancel     : {on: 'UPDATE'}
    @bpm.process.businessKey: (ID)
    entity CancelOnUpdateDefaultCascade  as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Cancel on DELETE without cascade (should default to false)
    @bpm.process.cancel     : {on: 'DELETE'}
    @bpm.process.businessKey: (ID)
    entity CancelOnDeleteDefaultCascade  as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on CREATE without cascade (should default to false)
    @bpm.process.suspend    : {on: 'CREATE'}
    @bpm.process.businessKey: (ID)
    entity SuspendOnCreateDefaultCascade as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend on UPDATE without cascade (should default to false)
    @bpm.process.suspend    : {on: 'UPDATE'}
    @bpm.process.businessKey: (ID)
    entity SuspendOnUpdateDefaultCascade as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on CREATE without cascade (should default to false)
    @bpm.process.resume     : {on: 'CREATE'}
    @bpm.process.businessKey: (ID)
    entity ResumeOnCreateDefaultCascade  as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume on UPDATE without cascade (should default to false)
    @bpm.process.resume     : {on: 'UPDATE'}
    @bpm.process.businessKey: (ID)
    entity ResumeOnUpdateDefaultCascade  as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }


    // ============================================
    // MULTI-EVENT DELETE COMBINATIONS
    // Testing multiple process events triggered by a single DELETE
    // ============================================

    // --------------------------------------------
    // Start + Cancel on DELETE
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'deleteStartCancelProcess',
        on: 'DELETE',
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteStartCancel             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Start + Resume on DELETE
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'deleteStartResumeProcess',
        on: 'DELETE',
    }
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteStartResume             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Cancel + Resume on DELETE
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteCancelResume            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Cancel + Suspend on DELETE
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.suspend    : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteCancelSuspend           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Cancel + Suspend on DELETE with if condition
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
        if     : (mileage > 500)
    }
    @bpm.process.suspend    : {
        on     : 'DELETE',
        cascade: true,
        if     : (mileage <= 500)
    }
    @bpm.process.businessKey: (ID)
    entity DeleteCancelSuspendIfExpr     as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Start + Cancel + Resume on DELETE (LocalTestService pattern)
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'deleteStartCancelResumeProcess',
        on: 'DELETE',
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteStartCancelResume       as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // All four events on DELETE
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'deleteAllEventsProcess',
        on: 'DELETE',
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.suspend    : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.resume     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteAllEvents               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Start with inputs + Cancel on DELETE
    // --------------------------------------------
    @bpm.process.start      : {
        id    : 'deleteStartInputsCancelProcess',
        on    : 'DELETE',
        inputs: [
            {
                path: $self.model,
                as  : 'CarModel'
            },
            {
                path: $self.manufacturer,
                as  : 'CarMaker'
            }
        ]
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity DeleteStartInputsCancel       as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // START INPUT ANNOTATION TESTS
    // Testing inputs array in @bpm.process.start
    // ============================================

    // --------------------------------------------
    // Test 1: No inputs specified
    // All entity fields should be included in context
    // --------------------------------------------
    @bpm.process.start: {
        id: 'startNoInputProcess',
        on: 'CREATE',
    }
    entity StartNoInput                  as
        projection on my.Shipments {
            ID,
            status,
            shipmentDate,
            expectedDelivery,
            origin,
            destination,
            totalValue,
            notes
        }

    // --------------------------------------------
    // Test 2: With inputs array on selected fields
    // Only specified fields should be included in context
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startSelectedInputProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.shipmentDate,
            $self.origin
        ]
    }
    entity StartSelectedInput {
        key ID               : UUID;
            status           : String(20) default 'PENDING';
            shipmentDate     : Date;
            expectedDelivery : Date;
            origin           : String(200);
            destination      : String(200);
            totalValue       : Decimal(15, 2);
    }

    // --------------------------------------------
    // Test 3: With inputs array with custom aliases
    // Fields should be renamed in context
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startAliasInputProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            {
                path: $self.shipmentDate,
                as  : 'ProcessStartDate'
            },
            {
                path: $self.origin,
                as  : 'SourceLocation'
            },
            {
                path: $self.destination,
                as  : 'TargetLocation'
            },
            {
                path: $self.totalValue,
                as  : 'Amount'
            }
        ]
    }
    entity StartAliasInput {
        key ID               : UUID;
            status           : String(20) default 'PENDING';
            shipmentDate     : Date;
            expectedDelivery : Date;
            origin           : String(200);
            destination      : String(200);
            totalValue       : Decimal(15, 2);
    }

    // --------------------------------------------
    // Test 4: With nested Composition in inputs
    // Include composition items in context (all fields)
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startNestedCompositionProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.shipmentDate,
            $self.items
        ]
    }
    entity StartNestedComposition {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            items        : Composition of many StartNestedCompositionItems
                               on items.parent = $self;
    }

    entity StartNestedCompositionItems {
        key ID       : UUID;
            parent   : Association to StartNestedComposition
                           on parent.ID = $self.parentID;
            parentID : UUID;
            title    : String(200);
            quantity : Integer;
            price    : Decimal(15, 2);
    }

    // --------------------------------------------
    // Test 5: With nested Composition - selected child fields
    // Include only selected fields from composition items
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startNestedSelectedProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.shipmentDate,
            $self.items.ID,
            $self.items.title,
            $self.items.price
        ]
    }
    entity StartNestedSelected {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            items        : Composition of many StartNestedSelectedItems
                               on items.parent = $self;
    }

    entity StartNestedSelectedItems {
        key ID       : UUID;
            parent   : Association to StartNestedSelected;
            title    : String(200);
            quantity : Integer;
            price    : Decimal(15, 2);
    }

    // --------------------------------------------
    // Test 6: With nested Composition and aliases
    // Child fields should be renamed in context
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startNestedAliasProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            {
                path: $self.orderDate,
                as  : 'ProcessDate'
            },
            {
                path: $self.items,
                as  : 'OrderLines'
            },
            $self.items.ID,
            {
                path: $self.items.productName,
                as  : 'Product'
            },
            {
                path: $self.items.quantity,
                as  : 'Qty'
            },
            {
                path: $self.items.unitPrice,
                as  : 'Price'
            }
        ]
    }
    entity StartNestedAlias {
        key ID        : UUID;
            status    : String(20) default 'PENDING';
            orderDate : Date;
            items     : Composition of many StartNestedAliasItems
                            on items.parent = $self;
    }

    entity StartNestedAliasItems {
        key ID          : UUID;
            parent      : Association to StartNestedAlias;
            productName : String(200);
            quantity    : Integer;
            unitPrice   : Decimal(15, 2);
    }

    // ============================================
    // CUSTOM EVENT / BOUND ACTION TESTS
    // Testing process annotations with custom events (bound actions)
    // ============================================

    // --------------------------------------------
    // Start process on bound action (no condition)
    // --------------------------------------------
    @bpm.process.start: {
        id: 'startOnActionProcess',
        on: 'triggerStart',
    }
    entity StartOnAction                 as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerStart() returns StartOnAction;
        }

    // --------------------------------------------
    // Start process on bound action with condition
    // --------------------------------------------
    @bpm.process.start: {
        id: 'startOnActionWhenProcess',
        on: 'triggerStartWhen',
        if: (mileage > 500)
    }
    entity StartOnActionWhen             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerStartWhen() returns StartOnActionWhen;
        }

    // --------------------------------------------
    // Cancel process on bound action (no condition)
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : 'triggerCancel',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnAction                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerCancel() returns CancelOnAction;
        }

    // --------------------------------------------
    // Cancel process on bound action with condition
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : 'triggerCancelWhen',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnActionWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerCancelWhen() returns CancelOnActionWhen;
        }

    // --------------------------------------------
    // Suspend process on bound action (no condition)
    // --------------------------------------------
    @bpm.process.suspend    : {
        on     : 'triggerSuspend',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnAction               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerSuspend() returns SuspendOnAction;
        }

    // --------------------------------------------
    // Suspend process on bound action with condition
    // --------------------------------------------
    @bpm.process.suspend    : {
        on     : 'triggerSuspendWhen',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnActionWhen           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerSuspendWhen() returns SuspendOnActionWhen;
        }

    // --------------------------------------------
    // Resume process on bound action (no condition)
    // --------------------------------------------
    @bpm.process.resume     : {
        on     : 'triggerResume',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnAction                as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerResume() returns ResumeOnAction;
        }

    // --------------------------------------------
    // Resume process on bound action with condition
    // --------------------------------------------
    @bpm.process.resume     : {
        on     : 'triggerResumeWhen',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnActionWhen            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerResumeWhen() returns ResumeOnActionWhen;
        }

    // ============================================
    // WILDCARD EVENT TESTS
    // Testing process annotations with '*' to trigger on all events
    // ============================================

    // --------------------------------------------
    // Start process on wildcard '*' (all CUD events + bound actions)
    // --------------------------------------------
    @bpm.process.start: {
        id: 'startOnWildcardProcess',
        on: '*',
    }
    entity StartOnWildcard               as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns StartOnWildcard;
        }

    // --------------------------------------------
    // Start process on wildcard '*' with condition
    // --------------------------------------------
    @bpm.process.start: {
        id: 'startOnWildcardWhenProcess',
        on: '*',
        if: (mileage > 500)
    }
    entity StartOnWildcardWhen           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns StartOnWildcardWhen;
        }

    // --------------------------------------------
    // Cancel process on wildcard '*' (all CUD events + bound actions)
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : '*',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnWildcard              as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns CancelOnWildcard;
        }

    // --------------------------------------------
    // Suspend process on wildcard '*' (all CUD events + bound actions)
    // --------------------------------------------
    @bpm.process.suspend    : {
        on     : '*',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity SuspendOnWildcard             as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns SuspendOnWildcard;
        }

    // --------------------------------------------
    // Resume process on wildcard '*' (all CUD events + bound actions)
    // --------------------------------------------
    @bpm.process.resume     : {
        on     : '*',
        cascade: false,
    }
    @bpm.process.businessKey: (ID)
    entity ResumeOnWildcard              as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns ResumeOnWildcard;
        }

    // --------------------------------------------
    // Wildcard with condition
    // --------------------------------------------
    @bpm.process.cancel     : {
        on     : '*',
        cascade: true,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (ID)
    entity CancelOnWildcardWhen          as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }
        actions {
            action triggerAction() returns CancelOnWildcardWhen;
        }

    // --------------------------------------------
    // Test 7: Deep cyclic path in inputs array
    // Demonstrates that explicit paths avoid cycle issues
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startCyclicPathProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.status,
            $self.items.ID,
            $self.items.title,
            $self.items.shipment.ID,
            $self.items.shipment.status,
            $self.items.shipment.items.ID,
            $self.items.shipment.items.title,
            $self.items.shipment.items.shipment.ID
        ]
    }
    entity StartCyclicPath {
        key ID     : UUID;
            status : String(20) default 'PENDING';
            items  : Composition of many StartCyclicPathItems
                         on items.shipment = $self;
    }

    entity StartCyclicPathItems {
        key ID       : UUID;
            shipment : Association to StartCyclicPath;
            title    : String(200);
    }

    // --------------------------------------------
    // Test 8: $self wildcard - all scalar fields
    // Using $self alone to include all scalar fields plus composition
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startSelfWildcardProcess',
        on    : 'CREATE',
        inputs: [
            $self, // All scalar fields of the entity
            $self.items // Plus the composition with all its scalar fields
        ]
    }
    entity StartSelfWildcard {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            totalValue   : Decimal(15, 2);
            items        : Composition of many StartSelfWildcardItems
                               on items.parent = $self;
    }

    entity StartSelfWildcardItems {
        key ID       : UUID;
            parent   : Association to StartSelfWildcard;
            title    : String(200);
            quantity : Integer;
    }

    // Test 9: $self wildcard with field alias override
    // $self expands all scalar fields, but $self.ID with alias should rename ID to OrderId
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startSelfWildcardAliasProcess',
        on    : 'CREATE',
        inputs: [
            $self, // All scalar fields: ID, status, shipmentDate, totalValue
            $self.items, // Composition with all its scalar fields
            {
                path: $self.ID,
                as  : 'OrderId'
            } // Rename ID to OrderId
        ]
    }
    entity StartSelfWildcardAlias {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            totalValue   : Decimal(15, 2);
            items        : Composition of many StartSelfWildcardAliasItems
                               on items.parent = $self;
    }

    entity StartSelfWildcardAliasItems {
        key ID       : UUID;
            parent   : Association to StartSelfWildcardAlias;
            title    : String(200);
            quantity : Integer;
    }

    // Test 10: $self.items (composition wildcard) with child field alias
    // $self.items expands all child fields, but $self.items.ID with alias should add ItemId
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startCompositionWildcardAliasProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            $self.status,
            $self.items, // All scalar fields of items: ID, title, quantity, parent_ID
            {
                path: $self.items.ID,
                as  : 'ItemId'
            } // Rename items.ID to ItemId (adds second copy)
        ]
    }
    entity StartCompositionWildcardAlias {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            totalValue   : Decimal(15, 2);
            items        : Composition of many StartCompositionWildcardAliasItems
                               on items.parent = $self;
    }

    entity StartCompositionWildcardAliasItems {
        key ID       : UUID;
            parent   : Association to StartCompositionWildcardAlias;
            title    : String(200);
            quantity : Integer;
    }

    // Test 11: Multiple aliases on the same scalar field
    // Same field (ID) should appear under two different names
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startMultipleAliasScalarProcess',
        on    : 'CREATE',
        inputs: [
            {
                path: $self.ID,
                as  : 'OrderId'
            }, // ID as OrderId
            {
                path: $self.ID,
                as  : 'ReferenceId'
            } // ID as ReferenceId (same source, different alias)
        ]
    }
    entity StartMultipleAliasScalar {
        key ID           : UUID;
            status       : String(20) default 'PENDING';
            shipmentDate : Date;
            totalValue   : Decimal(15, 2);
    }

    // Test 12: Multiple aliases on the same composition
    // Same composition (items) should appear under two different names
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startMultipleAliasCompositionProcess',
        on    : 'CREATE',
        inputs: [
            $self.ID,
            {
                path: $self.items,
                as  : 'Orders'
            }, // items as Orders
            {
                path: $self.items,
                as  : 'LineItems'
            } // items as LineItems (same source, different alias)
        ]
    }
    entity StartMultipleAliasComposition {
        key ID     : UUID;
            status : String(20) default 'PENDING';
            items  : Composition of many StartMultipleAliasCompositionItems
                         on items.parent = $self;
    }

    entity StartMultipleAliasCompositionItems {
        key ID       : UUID;
            parent   : Association to StartMultipleAliasComposition;
            title    : String(200);
            quantity : Integer;
    }

    // Test 13: $self with Composition and Association
    // $self should only include scalar fields, NOT compositions or associations
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startSelfWithAssocProcess',
        on    : 'CREATE',
        inputs: [$self]
    }
    entity StartSelfWithAssoc {
        key ID     : UUID;
            status : String(20) default 'PENDING';
            author : Association to one StartSelfWithAssocAuthors;
    }

    entity StartSelfWithAssocAuthors {
        key ID : UUID;
    }

    // Test 14: $self.author - explicitly include association
    // Should expand the author association with all its fields
    // --------------------------------------------
    @bpm.process.start: {
        id    : 'startWithAuthorInputProcess',
        on    : 'CREATE',
        inputs: [
            $self,
            $self.author
        ]
    }
    entity StartWithAuthorInput {
        key ID     : UUID;
            status : String(20) default 'PENDING';
            items  : Composition of many StartWithAuthorInputItems
                         on items.parent = $self;
            author : Association to one StartWithAuthorInputAuthors;
    }

    entity StartWithAuthorInputItems {
        key ID       : UUID;
            parent   : Association to StartWithAuthorInput;
            title    : String(200);
            quantity : Integer;
    }

    entity StartWithAuthorInputAuthors {
        key ID   : UUID;
            name : String(100);
    }

    // ============================================
    // BUSINESS KEY LENGTH VALIDATION TESTS
    // Testing businessKey max length (255 chars) on processStart
    // ============================================

    // Start on CREATE with businessKey (short value - well under 255 chars)
    @bpm.process.start      : {
        id: 'startShortBusinessKeyProcess',
        on: 'CREATE',
    }
    @bpm.process.businessKey: (ID)
    entity StartWithShortBusinessKey     as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Start on CREATE with businessKey at exactly 255 chars
    @bpm.process.start      : {
        id: 'startExactLimitBusinessKeyProcess',
        on: 'CREATE',
    }
    @bpm.process.businessKey: (longValue)
    entity StartWithExactLimitBusinessKey {
        key ID        : UUID;
            longValue : String(300);
            name      : String(100);
    }

    // Start on CREATE with businessKey exceeding 255 chars
    @bpm.process.start      : {
        id: 'startExceedingBusinessKeyProcess',
        on: 'CREATE',
    }
    @bpm.process.businessKey: (longValue)
    entity StartWithExceedingBusinessKey {
        key ID        : UUID;
            longValue : String(300);
            name      : String(100);
    }

    // Start on DELETE with businessKey exceeding 255 chars
    @bpm.process.start      : {
        id: 'startOnDeleteExceedingBusinessKeyProcess',
        on: 'DELETE',
    }
    @bpm.process.businessKey: (longValue)
    entity StartOnDeleteExceedingBusinessKey {
        key ID        : UUID;
            longValue : String(300);
            name      : String(100);
    }

    // Start on UPDATE with businessKey exceeding 255 chars
    @bpm.process.start      : {
        id: 'startOnUpdateExceedingBusinessKeyProcess',
        on: 'UPDATE',
    }
    @bpm.process.businessKey: (longValue)
    entity StartOnUpdateExceedingBusinessKey {
        key ID        : UUID;
            longValue : String(300);
            name      : String(100);
    }

    // ============================================
    // BUSINESS KEY ALIAS COLLISION TEST
    // Validates that there is no collision between the businessKey alias and an entity field named "businessKey"
    // ============================================

    @bpm.process.start      : {
        id: 'businessKeyCollisionProcess',
        on: 'CREATE',
    }
    @bpm.process.businessKey: (ID)
    entity BusinessKeyCollisionTest {
        key ID          : UUID;
            businessKey : String(100);
            name        : String(100);
    }

    // ============================================
    // COMPOSITE BUSINESS KEY TESTS
    // Testing businessKey with concat expressions
    // ============================================

    // Cancel with businessKey composed from two fields
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: false,
    }
    @bpm.process.businessKey: (model || '-' || manufacturer)
    entity CancelCompositeKey            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Suspend with businessKey composed from two fields
    @bpm.process.suspend    : {
        on     : 'UPDATE',
        cascade: false,
        if     : (mileage > 500),
    }
    @bpm.process.businessKey: (manufacturer || '_' || model)
    entity SuspendCompositeKey           as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Resume with businessKey composed from two fields
    @bpm.process.resume     : {
        on     : 'UPDATE',
        cascade: false,
        if     : (mileage <= 500),
    }
    @bpm.process.businessKey: (manufacturer || '_' || model)
    entity ResumeCompositeKey            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Full lifecycle with composite businessKey on all action annotations
    @bpm.process.start      : {
        id: 'compositeKeyLifecycleProcess',
        on: 'CREATE',
    }
    @bpm.process.suspend    : {
        on     : 'UPDATE',
        cascade: false,
        if     : (mileage > 500),
    }
    @bpm.process.resume     : {
        on     : 'UPDATE',
        cascade: false,
        if     : (mileage <= 500),
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (model || '/' || manufacturer)
    entity CompositeKeyLifecycle         as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // ============================================
    // COMBINATION ENTITIES - Real-world lifecycle scenarios
    // ============================================

    // ============================================
    // MULTIPLE START ANNOTATION TESTS
    // Testing multiple @bpm.process.start with qualifiers
    // ============================================

    // Two start annotations both on CREATE
    @bpm.process.start      : {
        id: 'multiStartCreateProcess1',
        on: 'CREATE',
    }
    @bpm.process.start #two : {
        id: 'multiStartCreateProcess2',
        on: 'CREATE',
    }
    entity MultiStartOnCreate            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Two start annotations on different events (CREATE + UPDATE)
    @bpm.process.start      : {
        id: 'multiStartDiffEventProcess1',
        on: 'CREATE',
    }
    @bpm.process.start #two : {
        id: 'multiStartDiffEventProcess2',
        on: 'UPDATE',
    }
    entity MultiStartDiffEvents          as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Two start annotations both on DELETE
    @bpm.process.start      : {
        id: 'multiStartDeleteProcess1',
        on: 'DELETE',
    }
    @bpm.process.start #two : {
        id: 'multiStartDeleteProcess2',
        on: 'DELETE',
    }
    @bpm.process.businessKey: (ID)
    entity MultiStartOnDelete            as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // Two start annotations on CREATE, qualified one has an if condition
    @bpm.process.start      : {
        id: 'multiStartIfProcess1',
        on: 'CREATE',
    }
    @bpm.process.start #two : {
        id: 'multiStartIfProcess2',
        on: 'CREATE',
        if: (mileage > 500)
    }
    entity MultiStartWithCondition       as
        projection on my.Car {
            ID,
            model,
            manufacturer,
            mileage,
            year
        }

    // --------------------------------------------
    // Scenario 1: Basic Workflow Lifecycle
    // Start process on CREATE, Cancel on DELETE
    // Use case: Order processing, ticket management
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'lifecycle_Process',
        on: 'CREATE',
    }
    @bpm.process.cancel     : {
        on     : 'DELETE',
        cascade: true,
    }
    @bpm.process.businessKey: (ID)
    entity BasicLifecycle {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

    // --------------------------------------------
    // Scenario 2: Status-based Cancellation
    // Start on CREATE, Cancel on UPDATE when mileage exceeds threshold
    // Use case: Auto-cancel workflow when entity reaches terminal state
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'lifecycle_Process',
        on: 'CREATE',
    }
    @bpm.process.cancel     : {
        on: 'UPDATE',
        if: (mileage > 1000),
    }
    @bpm.process.businessKey: (ID)
    entity StatusBasedCancel {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

    // --------------------------------------------
    // Scenario 3: Suspend/Resume Workflow
    // Start on CREATE, Suspend on UPDATE (if mileage > 500),
    // Resume on UPDATE (if mileage <= 500)
    // Use case: Pause processing when item is on hold
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'lifecycle_Process',
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
    entity SuspendResumeWorkflow {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

    // --------------------------------------------
    // Scenario 4: Full Lifecycle Management
    // Start on CREATE, Suspend/Resume on UPDATE, Cancel on DELETE
    // Use case: Complete process lifecycle managed through entity CRUD operations
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'lifecycle_Process',
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
    entity FullLifecycle {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

    // --------------------------------------------
    // Scenario 5: Conditional Start and Cancel
    // Start on UPDATE when condition met, Cancel on UPDATE when different condition
    // Use case: Workflow triggered by status change, cancelled by another status
    // --------------------------------------------
    @bpm.process.start      : {
        id: 'lifecycle_Process',
        on: 'UPDATE',
        if: (mileage > 500)
    }
    @bpm.process.cancel     : {
        on: 'UPDATE',
        if: (mileage > 1500),
    }
    @bpm.process.businessKey: (ID)
    entity ConditionalStartCancel {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
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
    @bpm.process.cancel     : {on: 'DELETE'}
    @bpm.process.businessKey: (ID)
    entity ExternalWorkflowManagement {
        key ID           : UUID;
            model        : String(100);
            manufacturer : String(100);
            mileage      : Integer;
            year         : Integer;
    }

}
