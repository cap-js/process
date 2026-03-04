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
    id: 'shipmentProcess',
    on: 'CREATE',
  }
  entity InputShipments {
    key ID               : UUID @bpm.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @bpm.process.input;
        expectedDelivery : Date;
        origin           : String(200) @(bpm.process.input: 'OriginCountry');
        destination      : String(200);
        items            : Composition of many InputShipmentItems
                             on items.shipment = $self
                           @bpm.process.input;
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

  @bpm.process.start: {
    id: 'carProcess',
    on: 'CREATE',
    if: (mileage > 1000)
  }
  @bpm.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1000)
  }
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
  @bpm.process.cancel: {
    on: 'CREATE',
    cascade: false,
  }
  entity CancelOnCreate                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on CREATE with if condition
  @bpm.process.cancel: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnCreateWhen            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE without when condition
  @bpm.process.cancel: {
    on: 'UPDATE',
    cascade: false,
  }
  entity CancelOnUpdate                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE with if condition
  @bpm.process.cancel: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnUpdateWhen            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE without when condition
  @bpm.process.cancel: {
    on: 'DELETE',
    cascade: false,
  }
  entity CancelOnDelete                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE with if condition
  @bpm.process.cancel: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
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
  @bpm.process.suspend: {
    on: 'CREATE',
    cascade: false,
  }
  entity SuspendOnCreate               as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on CREATE with if condition
  @bpm.process.suspend: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnCreateWhen           as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE without when condition
  @bpm.process.suspend: {
    on: 'UPDATE',
    cascade: false,
  }
  entity SuspendOnUpdate               as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE with if condition
  @bpm.process.suspend: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnUpdateWhen           as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on DELETE without when condition
  @bpm.process.suspend: {
    on: 'DELETE',
    cascade: false,
  }
  entity SuspendOnDelete               as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on DELETE with if condition
  @bpm.process.suspend: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
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
  @bpm.process.resume: {
    on: 'CREATE',
    cascade: false,
  }
  entity ResumeOnCreate                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on CREATE with if condition
  @bpm.process.resume: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnCreateWhen            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE without when condition
  @bpm.process.resume: {
    on: 'UPDATE',
    cascade: false,
  }
  entity ResumeOnUpdate                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE with if condition
  @bpm.process.resume: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnUpdateWhen            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on DELETE without when condition
  @bpm.process.resume: {
    on: 'DELETE',
    cascade: false,
  }
  entity ResumeOnDelete                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on DELETE with if condition
  @bpm.process.resume: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
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
  @bpm.process.cancel: {on: 'CREATE', }
  entity CancelOnCreateDefaultCascade  as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE without cascade (should default to false)
  @bpm.process.cancel: {on: 'UPDATE', }
  entity CancelOnUpdateDefaultCascade  as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE without cascade (should default to false)
  @bpm.process.cancel: {on: 'DELETE', }
  entity CancelOnDeleteDefaultCascade  as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on CREATE without cascade (should default to false)
  @bpm.process.suspend: {on: 'CREATE', }
  entity SuspendOnCreateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE without cascade (should default to false)
  @bpm.process.suspend: {on: 'UPDATE', }
  entity SuspendOnUpdateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on CREATE without cascade (should default to false)
  @bpm.process.resume: {on: 'CREATE', }
  entity ResumeOnCreateDefaultCascade  as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE without cascade (should default to false)
  @bpm.process.resume: {on: 'UPDATE', }
  entity ResumeOnUpdateDefaultCascade  as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // ============================================
  // COMBINATION ENTITIES - Real-world scenarios
  // ============================================

  // --------------------------------------------
  // Scenario 1: Basic Workflow Lifecycle
  // Start process on CREATE, Cancel on DELETE
  // Use case: Order processing, ticket management
  // --------------------------------------------
  @bpm.process.start: {
    id: 'basicLifecycleProcess',
    on: 'CREATE',
  }
  @bpm.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
  entity BasicLifecycle                as
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
  @bpm.process.start: {
    id: 'statusCancelProcess',
    on: 'CREATE',
  }
  @bpm.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1000)
  }
  entity StatusBasedCancel             as
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
  @bpm.process.start: {
    id: 'suspendResumeProcess',
    on: 'CREATE',
  }
  @bpm.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 500)
  }
  @bpm.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 500)
  }
  entity SuspendResumeWorkflow         as
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
  @bpm.process.start: {
    id: 'fullLifecycleProcess',
    on: 'CREATE',
  }
  @bpm.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 800)
  }
  @bpm.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 800)
  }
  @bpm.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
  entity FullLifecycle                 as
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
  @bpm.process.start: {
    id: 'conditionalStartCancelProcess',
    on: 'UPDATE',
    if: (mileage > 500)
  }
  @bpm.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1500)
  }
  entity ConditionalStartCancel        as
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
  @bpm.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 500)
  }
  @bpm.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 500)
  }
  @bpm.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
  entity ExternalWorkflowManagement    as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // ============================================
  // START INPUT ANNOTATION TESTS
  // Testing @bpm.process.input variations
  // ============================================

  // --------------------------------------------
  // Test 1: No @bpm.process.input
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
  // Test 2: With @bpm.process.input on selected fields
  // Only annotated fields should be included in context
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startSelectedInputProcess',
    on: 'CREATE',
  }
  entity StartSelectedInput {
    key ID               : UUID @bpm.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @bpm.process.input;
        expectedDelivery : Date;
        origin           : String(200) @bpm.process.input;
        destination      : String(200);
        totalValue       : Decimal(15, 2);
  }

  // --------------------------------------------
  // Test 3: With @bpm.process.input with custom alias
  // Field should be renamed in context
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startAliasInputProcess',
    on: 'CREATE',
  }
  entity StartAliasInput {
    key ID               : UUID @bpm.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @(bpm.process.input: 'ProcessStartDate');
        expectedDelivery : Date;
        origin           : String(200) @(bpm.process.input: 'SourceLocation');
        destination      : String(200) @(bpm.process.input: 'TargetLocation');
        totalValue       : Decimal(15, 2) @(bpm.process.input: 'Amount');
  }

  // --------------------------------------------
  // Test 4: With nested Composition and @bpm.process.input
  // Include composition items in context (all fields)
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startNestedCompositionProcess',
    on: 'CREATE',
  }
  entity StartNestedComposition {
    key ID           : UUID @bpm.process.input;
        status       : String(20) default 'PENDING';
        shipmentDate : Date @bpm.process.input;
        items        : Composition of many StartNestedCompositionItems
                         on items.parent = $self
                       @bpm.process.input;
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
  // Test 5: With nested Composition and @bpm.process.input on child elements
  // Include only selected fields from composition items
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startNestedSelectedProcess',
    on: 'CREATE',
  }
  entity StartNestedSelected {
    key ID           : UUID @bpm.process.input;
        status       : String(20) default 'PENDING';
        shipmentDate : Date @bpm.process.input;
        items        : Composition of many StartNestedSelectedItems
                         on items.parent = $self
                       @bpm.process.input;
  }

  entity StartNestedSelectedItems {
    key ID       : UUID @bpm.process.input;
        parent   : Association to StartNestedSelected;
        title    : String(200) @bpm.process.input;
        quantity : Integer;
        price    : Decimal(15, 2) @bpm.process.input;
  }

  // --------------------------------------------
  // Test 6: With nested Composition and aliases in child elements
  // Child fields should be renamed in context
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startNestedAliasProcess',
    on: 'CREATE',
  }
  entity StartNestedAlias {
    key ID        : UUID @bpm.process.input;
        status    : String(20) default 'PENDING';
        orderDate : Date @(bpm.process.input: 'ProcessDate');
        items     : Composition of many StartNestedAliasItems
                      on items.parent = $self
                    @(bpm.process.input: 'OrderLines');
  }

  entity StartNestedAliasItems {
    key ID          : UUID @bpm.process.input;
        parent      : Association to StartNestedAlias;
        productName : String(200) @(bpm.process.input: 'Product');
        quantity    : Integer @(bpm.process.input: 'Qty');
        unitPrice   : Decimal(15, 2) @(bpm.process.input: 'Price');
  }

  // ============================================
  // MULTIPLE START ANNOTATIONS VIA QUALIFIERS
  // Testing @build.process.start #qualifier support
  // ============================================

  // --------------------------------------------
  // Test: Two processes start on same event (no conditions)
  // Both approvalProcess and notificationProcess should start on CREATE
  // --------------------------------------------
  @build.process.start #approval: {
    id: 'approvalProcess',
    on: 'CREATE',
  }
  @build.process.start #notification: {
    id: 'notificationProcess',
    on: 'CREATE',
  }
  entity MultiStartOnCreate                as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // --------------------------------------------
  // Test: Two processes start on different events
  // approvalProcess starts on CREATE, auditProcess starts on UPDATE
  // --------------------------------------------
  @build.process.start #approvalCreate: {
    id: 'approvalProcess',
    on: 'CREATE',
  }
  @build.process.start #auditUpdate: {
    id: 'auditProcess',
    on: 'UPDATE',
  }
  entity MultiStartDifferentEvents         as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // --------------------------------------------
  // Test: Two processes with conditions on same event
  // highMileageProcess starts if mileage > 500, lowMileageProcess if mileage <= 500
  // --------------------------------------------
  @build.process.start #highMileage: {
    id: 'highMileageProcess',
    on: 'CREATE',
    if: (mileage > 500)
  }
  @build.process.start #lowMileage: {
    id: 'lowMileageProcess',
    on: 'CREATE',
    if: (mileage <= 500)
  }
  entity MultiStartWithCondition           as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // --------------------------------------------
  // Test: Three processes start on same event (no conditions)
  // processA, processB, processC should all start on CREATE
  // --------------------------------------------
  @build.process.start #procA: {
    id: 'processA',
    on: 'CREATE',
  }
  @build.process.start #procB: {
    id: 'processB',
    on: 'CREATE',
  }
  @build.process.start #procC: {
    id: 'processC',
    on: 'CREATE',
  }
  entity MultiStartThreeProcesses          as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // --------------------------------------------
  // Test 7: Cycles in composition with @bpm.process.input
  // Should throw error
  // --------------------------------------------
  @bpm.process.start: {
    id: 'startCycleProcess',
    on: 'CREATE',
  }
  entity StartCycleA {
    key ID       : UUID @bpm.process.input;
        name     : String @bpm.process.input;
        cycleB   : Association to StartCycleB
                     on cycleB.ID = $self.cycleBID
                   @bpm.process.input;
        cycleBID : UUID @bpm.process.input;
  }

  entity StartCycleB {
    key ID       : UUID @bpm.process.input;
        name     : String @bpm.process.input;
        cycleA   : Association to StartCycleA
                     on cycleA.ID = $self.cycleAID
                   @bpm.process.input;
        cycleAID : UUID @bpm.process.input;
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
  entity StartOnAction as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
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
  entity StartOnActionWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerStartWhen() returns StartOnActionWhen;
  }

  // --------------------------------------------
  // Cancel process on bound action (no condition)
  // --------------------------------------------
  @bpm.process.cancel: {
    on: 'triggerCancel',
    cascade: false,
  }
  entity CancelOnAction as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerCancel() returns CancelOnAction;
  }

  // --------------------------------------------
  // Cancel process on bound action with condition
  // --------------------------------------------
  @bpm.process.cancel: {
    on: 'triggerCancelWhen',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnActionWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerCancelWhen() returns CancelOnActionWhen;
  }

  // --------------------------------------------
  // Suspend process on bound action (no condition)
  // --------------------------------------------
  @bpm.process.suspend: {
    on: 'triggerSuspend',
    cascade: false,
  }
  entity SuspendOnAction as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerSuspend() returns SuspendOnAction;
  }

  // --------------------------------------------
  // Suspend process on bound action with condition
  // --------------------------------------------
  @bpm.process.suspend: {
    on: 'triggerSuspendWhen',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnActionWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerSuspendWhen() returns SuspendOnActionWhen;
  }

  // --------------------------------------------
  // Resume process on bound action (no condition)
  // --------------------------------------------
  @bpm.process.resume: {
    on: 'triggerResume',
    cascade: false,
  }
  entity ResumeOnAction as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerResume() returns ResumeOnAction;
  }

  // --------------------------------------------
  // Resume process on bound action with condition
  // --------------------------------------------
  @bpm.process.resume: {
    on: 'triggerResumeWhen',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnActionWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
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
  entity StartOnWildcard as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
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
  entity StartOnWildcardWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerAction() returns StartOnWildcardWhen;
  }

  // --------------------------------------------
  // Cancel process on wildcard '*' (all CUD events + bound actions)
  // --------------------------------------------
  @bpm.process.cancel: {
    on: '*',
    cascade: false,
  }
  entity CancelOnWildcard as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerAction() returns CancelOnWildcard;
  }

  // --------------------------------------------
  // Suspend process on wildcard '*' (all CUD events + bound actions)
  // --------------------------------------------
  @bpm.process.suspend: {
    on: '*',
    cascade: false,
  }
  entity SuspendOnWildcard as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerAction() returns SuspendOnWildcard;
  }

  // --------------------------------------------
  // Resume process on wildcard '*' (all CUD events + bound actions)
  // --------------------------------------------
  @bpm.process.resume: {
    on: '*',
    cascade: false,
  }
  entity ResumeOnWildcard as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerAction() returns ResumeOnWildcard;
  }

  // --------------------------------------------
  // Wildcard with condition
  // --------------------------------------------
  @bpm.process.cancel: {
    on: '*',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnWildcardWhen as projection on my.Car {
    ID, model, manufacturer, mileage, year
  } actions {
    action triggerAction() returns CancelOnWildcardWhen;
  }
}
