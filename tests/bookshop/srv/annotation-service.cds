using {sap.capire.bookshop as my} from '../db/shipment';

service AnnotationService {

  @build.process.start: {
    id: 'shipmentProcess',
    on: 'CREATE',
  }
  entity Shipments                  as
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

  entity ShipmentItems              as
    projection on my.ShipmentItems {
      ID,
      shipment : Association to Shipments
                   on shipment.ID = $self.shipment.ID,
      title,
      quantity,
      price,
      weight,
    }

  @build.process.start: {
    id: 'shipmentProcess',
    on: 'CREATE',
  }
  entity InputShipments {
    key ID               : UUID @build.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @build.process.input;
        expectedDelivery : Date;
        origin           : String(200) @(build.process.input: 'OriginCountry');
        destination      : String(200);
        items            : Composition of many InputShipmentItems
                             on items.shipment = $self
                           @build.process.input;
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

  @build.process.start: {
    id: 'carProcess',
    on: 'CREATE',
    if: (mileage > 1000)
  }
  @build.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1000)
  }
  entity CarWhen                    as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  @build.process.start: {
    id: 'carProcess',
    on: 'DELETE',
  }
  entity CarOnDel                   as
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
  @build.process.start: {
    id: 'startOnCreateProcess',
    on: 'CREATE',
  }
  entity StartOnCreate              as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Start on CREATE with if condition
  @build.process.start: {
    id: 'startOnCreateWhenProcess',
    on: 'CREATE',
    if: (mileage > 500)
  }
  entity StartOnCreateWhen          as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Start on UPDATE without when condition
  @build.process.start: {
    id: 'startOnUpdateProcess',
    on: 'UPDATE',
  }
  entity StartOnUpdate              as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Start on UPDATE with if condition
  @build.process.start: {
    id: 'startOnUpdateWhenProcess',
    on: 'UPDATE',
    if: (mileage > 500)
  }
  entity StartOnUpdateWhen          as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Start on DELETE without when condition
  @build.process.start: {
    id: 'startOnDeleteProcess',
    on: 'DELETE',
  }
  entity StartOnDelete              as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Start on DELETE with if condition
  @build.process.start: {
    id: 'startOnDeleteWhenProcess',
    on: 'DELETE',
    if: (mileage > 500)
  }
  entity StartOnDeleteWhen          as
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
  @build.process.cancel: {
    on: 'CREATE',
    cascade: false,
  }
  entity CancelOnCreate             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on CREATE with if condition
  @build.process.cancel: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnCreateWhen         as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE without when condition
  @build.process.cancel: {
    on: 'UPDATE',
    cascade: false,
  }
  entity CancelOnUpdate             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE with if condition
  @build.process.cancel: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnUpdateWhen         as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE without when condition
  @build.process.cancel: {
    on: 'DELETE',
    cascade: false,
  }
  entity CancelOnDelete             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE with if condition
  @build.process.cancel: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
  entity CancelOnDeleteWhen         as
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
  @build.process.suspend: {
    on: 'CREATE',
    cascade: false,
  }
  entity SuspendOnCreate            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on CREATE with if condition
  @build.process.suspend: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnCreateWhen        as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE without when condition
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: false,
  }
  entity SuspendOnUpdate            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE with if condition
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnUpdateWhen        as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on DELETE without when condition
  @build.process.suspend: {
    on: 'DELETE',
    cascade: false,
  }
  entity SuspendOnDelete            as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on DELETE with if condition
  @build.process.suspend: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
  entity SuspendOnDeleteWhen        as
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
  @build.process.resume: {
    on: 'CREATE',
    cascade: false,
  }
  entity ResumeOnCreate             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on CREATE with if condition
  @build.process.resume: {
    on: 'CREATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnCreateWhen         as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE without when condition
  @build.process.resume: {
    on: 'UPDATE',
    cascade: false,
  }
  entity ResumeOnUpdate             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE with if condition
  @build.process.resume: {
    on: 'UPDATE',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnUpdateWhen         as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on DELETE without when condition
  @build.process.resume: {
    on: 'DELETE',
    cascade: false,
  }
  entity ResumeOnDelete             as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on DELETE with if condition
  @build.process.resume: {
    on: 'DELETE',
    cascade: true,
    if: (mileage > 500)
  }
  entity ResumeOnDeleteWhen         as
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
  @build.process.cancel: {
    on: 'CREATE',
  }
  entity CancelOnCreateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on UPDATE without cascade (should default to false)
  @build.process.cancel: {
    on: 'UPDATE',
  }
  entity CancelOnUpdateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Cancel on DELETE without cascade (should default to false)
  @build.process.cancel: {
    on: 'DELETE',
  }
  entity CancelOnDeleteDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on CREATE without cascade (should default to false)
  @build.process.suspend: {
    on: 'CREATE',
  }
  entity SuspendOnCreateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Suspend on UPDATE without cascade (should default to false)
  @build.process.suspend: {
    on: 'UPDATE',
  }
  entity SuspendOnUpdateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on CREATE without cascade (should default to false)
  @build.process.resume: {
    on: 'CREATE',
  }
  entity ResumeOnCreateDefaultCascade as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // Resume on UPDATE without cascade (should default to false)
  @build.process.resume: {
    on: 'UPDATE',
  }
  entity ResumeOnUpdateDefaultCascade as
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
  @build.process.start: {
    id: 'basicLifecycleProcess',
    on: 'CREATE',
  }
  @build.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
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
  @build.process.start: {
    id: 'statusCancelProcess',
    on: 'CREATE',
  }
  @build.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1000)
  }
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
  @build.process.start: {
    id: 'suspendResumeProcess',
    on: 'CREATE',
  }
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 500)
  }
  @build.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 500)
  }
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
  @build.process.start: {
    id: 'fullLifecycleProcess',
    on: 'CREATE',
  }
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 800)
  }
  @build.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 800)
  }
  @build.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
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
  @build.process.start: {
    id: 'conditionalStartCancelProcess',
    on: 'UPDATE',
    if: (mileage > 500)
  }
  @build.process.cancel: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 1500)
  }
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
  @build.process.suspend: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage > 500)
  }
  @build.process.resume: {
    on: 'UPDATE',
    cascade: false,
    if: (mileage <= 500)
  }
  @build.process.cancel: {
    on: 'DELETE',
    cascade: true,
  }
  entity ExternalWorkflowManagement as
    projection on my.Car {
      ID,
      model,
      manufacturer,
      mileage,
      year
    }

  // ============================================
  // START INPUT ANNOTATION TESTS
  // Testing @build.process.input variations
  // ============================================

  // --------------------------------------------
  // Test 1: No @build.process.input
  // All entity fields should be included in context
  // --------------------------------------------
  @build.process.start: {
    id: 'startNoInputProcess',
    on: 'CREATE',
  }
  entity StartNoInput               as
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
  // Test 2: With @build.process.input on selected fields
  // Only annotated fields should be included in context
  // --------------------------------------------
  @build.process.start: {
    id: 'startSelectedInputProcess',
    on: 'CREATE',
  }
  entity StartSelectedInput {
    key ID               : UUID @build.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @build.process.input;
        expectedDelivery : Date;
        origin           : String(200) @build.process.input;
        destination      : String(200);
        totalValue       : Decimal(15, 2);
  }

  // --------------------------------------------
  // Test 3: With @build.process.input with custom alias
  // Field should be renamed in context
  // --------------------------------------------
  @build.process.start: {
    id: 'startAliasInputProcess',
    on: 'CREATE',
  }
  entity StartAliasInput {
    key ID               : UUID @build.process.input;
        status           : String(20) default 'PENDING';
        shipmentDate     : Date @(build.process.input: 'ProcessStartDate');
        expectedDelivery : Date;
        origin           : String(200) @(build.process.input: 'SourceLocation');
        destination      : String(200) @(build.process.input: 'TargetLocation');
        totalValue       : Decimal(15, 2) @(build.process.input: 'Amount');
  }

  // --------------------------------------------
  // Test 4: With nested Composition and @build.process.input
  // Include composition items in context (all fields)
  // --------------------------------------------
  @build.process.start: {
    id: 'startNestedCompositionProcess',
    on: 'CREATE',
  }
  entity StartNestedComposition {
    key ID           : UUID @build.process.input;
        status       : String(20) default 'PENDING';
        shipmentDate : Date @build.process.input;
        items        : Composition of many StartNestedCompositionItems
                         on items.parent = $self
                       @build.process.input;
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
  // Test 5: With nested Composition and @build.process.input on child elements
  // Include only selected fields from composition items
  // --------------------------------------------
  @build.process.start: {
    id: 'startNestedSelectedProcess',
    on: 'CREATE',
  }
  entity StartNestedSelected {
    key ID           : UUID @build.process.input;
        status       : String(20) default 'PENDING';
        shipmentDate : Date @build.process.input;
        items        : Composition of many StartNestedSelectedItems
                         on items.parent = $self
                       @build.process.input;
  }

  entity StartNestedSelectedItems {
    key ID       : UUID @build.process.input;
        parent   : Association to StartNestedSelected;
        title    : String(200) @build.process.input;
        quantity : Integer;
        price    : Decimal(15, 2) @build.process.input;
  }

  // --------------------------------------------
  // Test 6: With nested Composition and aliases in child elements
  // Child fields should be renamed in context
  // --------------------------------------------
  @build.process.start: {
    id: 'startNestedAliasProcess',
    on: 'CREATE',
  }
  entity StartNestedAlias {
    key ID        : UUID @build.process.input;
        status    : String(20) default 'PENDING';
        orderDate : Date @(build.process.input: 'ProcessDate');
        items     : Composition of many StartNestedAliasItems
                      on items.parent = $self
                    @(build.process.input: 'OrderLines');
  }

  entity StartNestedAliasItems {
    key ID          : UUID @build.process.input;
        parent      : Association to StartNestedAlias;
        productName : String(200) @(build.process.input: 'Product');
        quantity    : Integer @(build.process.input: 'Qty');
        unitPrice   : Decimal(15, 2) @(build.process.input: 'Price');
  }

  // --------------------------------------------
  // Test 7: Cycles in composition with @build.process.input
  // Should throw error
  // --------------------------------------------
  @build.process.start: {
    id: 'startCycleProcess',
    on: 'CREATE',
  }
  entity StartCycleA {
    key ID       : UUID @build.process.input;
        name     : String @build.process.input;
        cycleB   : Association to StartCycleB
                     on cycleB.ID = $self.cycleBID
                   @build.process.input;
        cycleBID : UUID @build.process.input;
  }

  entity StartCycleB {
    key ID       : UUID @build.process.input;
        name     : String @build.process.input;
        cycleA   : Association to StartCycleA
                     on cycleA.ID = $self.cycleAID
                   @build.process.input;
        cycleAID : UUID @build.process.input;
  }
}
