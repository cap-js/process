# CAP - Process Plugin

[![REUSE status](https://api.reuse.software/badge/github.com/cap-js/process)](https://api.reuse.software/info/github.com/cap-js/process)

CAP Plugin to interact with SAP Build Process Automation to manage processes.

## Table of Contents

- [Setup](#setup)
  - [Quickstart](#quickstart)
  - [Binding against SBPA Instance](#binding-against-sbpa-instance)
  - [Importing Processes as a Service](#importing-processes-as-a-service)
- [Annotations](#annotations)
  - [Starting a Process](#starting-a-process)
  - [Cancelling, Resuming, or Suspending a Process](#cancelling-resuming-or-suspending-a-process)
  - [Conditional Execution](#conditional-execution)
  - [Input Mapping](#input-mapping)
- [Programmatic Approach](#programmatic-approach)
  - [Specific Process Services](#specific-process-services)
  - [Generic ProcessService](#generic-processservice)
- [Build-Time Validation](#build-time-validation)
  - [Process Start](#process-start)
  - [Process Cancel/Suspend/Resume](#process-cancelsuspendresume)
- [Running the Sample](#running-the-sample)
  - [Running the Bookshop Example](#running-the-bookshop-example)
  - [Troubleshooting](#troubleshooting)
- [Support, Feedback, Contributing](#support-feedback-contributing)
- [Security / Disclosure](#security--disclosure)
- [Code of Conduct](#code-of-conduct)
- [Licensing](#licensing)

## Setup

### Quickstart

To add the plugin to your CAP Node.js application, run:

```
npm add @cap-js/process
```

That's it — the annotation and programmatic approaches against the generic ProcessService work without any bindings against SBPA. No process import is required to get started.

You can have a look at the sample in [Status management](./tests/sample/status-management/README.md), or you can jump directly to the documentation of either [Annotations](#annotations) or the [Programmatic Approach](#programmatic-approach).

### Binding against SBPA Instance

To connect to a real SBPA instance, login to Cloud Foundry:

```
cf login --sso
```

Bind to a ProcessService instance:

```
cds bind ProcessService -2 <sbpa-service-instance>
```

### Importing Processes as a Service

The plugin allows you to import existing SBPA processes as CDS services. To do so, you first need to bind against an existing SBPA instance.
Imported processes ensure type safety and enable build-time validation.

```
cds import --from process --name <Process_ID>
```

## Annotations

### Starting a Process

- `@bpm.process.start.id` -- definition ID for deployed process
- `@bpm.process.start.on` -- event on which the process should be started (CRUD operation or custom bound action)
- `@bpm.process.start.inputs` -- Array of input mappings that control which entity fields are passed as process context (optional)
- If a `businessKey` is annotated on the entity using `@bpm.process.businessKey`, it will be evaluated at process start. If the length of the business key exceeds SBPA's character limit of 255, the request will be rejected, as process start will fail in that case.

```cds
service MyService {

    @bpm.process.start: {
        id: '<projectId>.<processId>',
        on: 'CREATE | UPDATE | DELETE | boundAction',
        inputs: [
            $self.field1,
            { path: $self.field2, as: 'AliasName' },
            $self.items,
            $self.items.nestedField
        ]
    }
    entity MyEntity {
        key ID     : UUID;
            field1 : String;
            field2 : String;
            items  : Composition of many ChildEntity on items.parent = $self;
    };

}
```

> See [Input Mapping](#input-mapping) below for detailed examples on controlling which entity fields are passed as process context.

### Cancelling, Resuming, or Suspending a Process

- `@bpm.process.<cancel|resume|suspend>` -- Cancel/Suspend/Resume any processes with the given businessKey
  - `@bpm.process.<cancel|resume|suspend>.on`
  - `@bpm.process.<cancel|resume|suspend>.cascade` -- Boolean (optional, defaults to false)
- For cancelling, resuming, or suspending, it is required to have a business key expression annotated on the entity using `@bpm.process.businessKey`. If no business key is annotated, the request will be rejected.
  - Example: `@bpm.process.businessKey: (id || '-' || name)`

Example:

```cds
service MyService {

    @bpm.process.<cancel|suspend|resume>: {
        on: 'CREATE | UPDATE | DELETE | boundAction',
        cascade: true | false  // optional, defaults to false
    }
    @bpm.process.businessKey(myElement || '-' || myElement2)
    entity MyProjection as projection on MyEntity {
      myElement,
      myElement2,
      myElement3
    };

}

```

### Conditional Execution

The `.if` annotation is available on all process operations (`start`, `cancel`, `suspend`, `resume`). It accepts a CDS expression and ensures the operation is only triggered when the expression evaluates to true.

- `@bpm.process.start.if` -- Only start the process if the expression evaluates to true
- `@bpm.process.<cancel|resume|suspend>.if` -- Only trigger the action if the expression evaluates to true

Examples:

```cds
// Only start the process if the order status is 'approved'
@bpm.process.start: {
    id: 'orderProcess',
    on: 'UPDATE',
    if: (status = 'approved')
}

// Only suspend the process if weight exceeds 10
@bpm.process.suspend: {
    on: 'UPDATE',
    if: (weight > 10)
}
```

### Input Mapping

The `inputs` array controls which entity fields are passed as context when starting a process.

#### No `inputs` Array (Default Behavior)

When `inputs` is not specified, **all direct attributes** of the entity are fetched and passed as process context. Associations and compositions are **not expanded** - only scalar fields are included.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE'
}
entity Orders {
    key ID       : UUID;
        status   : String(20);
        total    : Decimal(15, 2);
        items    : Composition of many OrderItems on items.order = $self;
};
// Context: { ID, status, total, businesskey }
// Note: 'items' composition is NOT included
```

#### Simple Field Selection

Use `$self.fieldName` to include specific fields.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        $self.status
    ]
}
entity Orders {
    key ID       : UUID;
        status   : String(20);
        total    : Decimal(15, 2);  // Not included
};
// Context: { ID, status, businesskey }
```

#### Wildcard: All Scalar Fields (`$self`)

Use `$self` alone (without a field name) to include **all scalar fields** of the entity. This is useful when you want all entity fields plus specific compositions.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self,         // All scalar fields: ID, status, shipmentDate, totalValue
        $self.items    // Plus the composition with all its scalar fields
    ]
}
entity Orders {
    key ID           : UUID;
        status       : String(20);
        shipmentDate : Date;
        totalValue   : Decimal(15, 2);
        items        : Composition of many OrderItems on items.parent = $self;
};
// Context: { ID, status, shipmentDate, totalValue, businesskey, items: [{ ID, title, quantity, parent_ID }, ...] }
```

**Note:** `$self` alone behaves identically to the default behavior (no `inputs` array), but allows you to combine it with explicit composition expansions in the same inputs array.

#### Field Aliasing

Use `{ path: $self.fieldName, as: 'TargetName' }` to rename fields for the process.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        { path: $self.total, as: 'OrderAmount' }
    ]
}
entity Orders {
    key ID    : UUID;
        total : Decimal(15, 2);
};
// Context: { ID, OrderAmount, businesskey }
```

#### Compositions and Associations

**Include composition without child field selection (`$self.items`):**

When you include a composition without specifying any nested fields (e.g., `$self.items` alone), **all direct attributes** of the child entity are expanded. This behaves like the default behavior but for the nested entity.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        $self.items    // Expands all direct attributes of OrderItems
    ]
}
entity Orders {
    key ID    : UUID;
        items : Composition of many OrderItems on items.order = $self;
};

entity OrderItems {
    key ID       : UUID;
        order    : Association to Orders;
        product  : String(200);
        quantity : Integer;
};
// Context: { ID, businesskey, items: [{ ID, product, quantity }, ...] }
// Note: 'order' association in child is NOT included (associations not expanded)
```

**Include composition with selected child fields (`$self.items.field`):**

When you specify nested field paths like `$self.items.ID` or `$self.items.product`, only those specific fields are included from the child entity.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        $self.items.ID,
        $self.items.product
        // quantity is NOT included
    ]
}
entity Orders {
    key ID    : UUID;
        items : Composition of many OrderItems on items.order = $self;
};

entity OrderItems {
    key ID       : UUID;
        order    : Association to Orders;
        product  : String(200);
        quantity : Integer;
};
// Context: { ID, businesskey, items: [{ ID, product }, ...] }
```

**Alias composition and nested fields:**

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        { path: $self.items, as: 'OrderLines' },
        $self.items.ID,
        { path: $self.items.product, as: 'ProductName' }
    ]
}
entity Orders {
    key ID    : UUID;
        items : Composition of many OrderItems on items.order = $self;
};

entity OrderItems {
    key ID      : UUID;
        product : String(200);
};
// Context: { ID, businesskey, OrderLines: [{ ID, ProductName }, ...] }
```

**Combining wildcards with aliases:**

You can combine wildcard expansion (`$self` or `$self.items`) with specific field aliases. The wildcard expands all fields, and the alias adds the field again with the new name.

```cds
@bpm.process.start: {
    id: 'orderProcess',
    on: 'CREATE',
    inputs: [
        $self,                                // All scalar fields: ID, status, total
        { path: $self.ID, as: 'OrderId' },    // Add ID again as 'OrderId'
        $self.items,                          // All child fields: ID, product, quantity
        { path: $self.items.ID, as: 'ItemId' } // Add items.ID again as 'ItemId'
    ]
}
entity Orders {
    key ID     : UUID;
        status : String(20);
        total  : Decimal(15, 2);
        items  : Composition of many OrderItems on items.order = $self;
};

entity OrderItems {
    key ID       : UUID;
        product  : String(200);
        quantity : Integer;
};
// Context: {
//   ID, OrderId,        // ID appears twice (original + alias)
//   status, total, businesskey,
//   items: [{
//     ID, ItemId,       // ID appears twice in each item
//     product, quantity
//   }, ...]
// }
```

#### Deep Paths (Cyclic Relationships)

For entities with cyclic relationships, explicit deep paths let you control exactly how deep to traverse without infinite loops.

```cds
@bpm.process.start: {
    id: 'shipmentProcess',
    on: 'CREATE',
    inputs: [
        $self.ID,
        $self.items.ID,
        $self.items.shipment.ID,           // Back to parent
        $self.items.shipment.items.ID      // Back to items again
    ]
}
entity Shipments {
    key ID    : UUID;
        items : Composition of many ShipmentItems on items.shipment = $self;
};

entity ShipmentItems {
    key ID       : UUID;
        shipment : Association to Shipments;
};
```

## Programmatic Approach

The plugin provides two ways to interact with SBPA processes programmatically:

1. **Specific ProcessService** -- Provides a process specific abstraction on the process as a CAP service.
2. **Generic ProcessService** -- Provides a generic abstraction on the [SBPA workflow api](https://api.sap.com/api/SPA_Workflow_Runtime/overview) as a CAP service.

The approaches work only in hybrid mode (against a real SBPA instance), and in production. For getAttributes and getOutputs, it is currently not possible to get the real attributes as in a running process.
For the lifecycle operations, the generic ProcessService allows you to set a business key in the header, which can then be used to execute the lifecycle operations in the local environment.
The specific ProcessService does not work locally in the current state of the plugin.

### Specific Process Services

For full type safety and build-time validation, you can import a specific SBPA process. This generates a typed CDS service with input/output types derived from the process definition.

#### Importing a Service

To import a process, you have two different options to import: First via the download of the model from you SBPA instance, or via a direct import from SBPA where you need a bound SBPA instance to your CAP Application (i.e. `cds bind`).

##### From downloaded model

Go to your SBPA instance > Control Tower > Environments > Select your environment where the process is deployed > Processes and Workflows > Select your process > Click on the "Download Model" button.

```bash
cds import --from process ~/Downloads/<your-process>.json
```

This will create:

- A new CDS service in `./srv/external/{projectId}.{processIdentifier}.cds` with the process definition used for build-time validation and the typed programmatic API
- A converted ProcessHeader JSON file in `./srv/workflows/{projectId}.{processIdentifier}.json` for future re-imports

##### From SBPA (Remote Import)

Import your SBPA process directly from SBPA.

**Note:** For this kind of imports, you must have ProcessService credentials bound. `cds import --from process` will resolve the credentials.

```bash
cds import --from process --name eu12.myorg.myproject.myProcess
```

This will create:

- A new CDS service in `./srv/external/eu12.myorg.myproject.myProcess.cds` with the process definition
- A ProcessHeader JSON file in `./srv/workflows/eu12.myorg.myproject.myProcess.json` with the process definition in JSON format

In case your external services are corrupted, you can re-import from the saved file in `./srv/workflows/`:

```bash
cds import --from process ./srv/workflows/eu12.myorg.myproject.myProcess.json
```

#### What Gets Generated

The import generates:

- A CDS service definition in `./srv/external/` (annotated with `@bpm.process` and `@protocol: 'none'`)
- Typed `ProcessInputs`, `ProcessOutputs`, `ProcessAttribute`, and `ProcessInstance` types based on the process definition
- Typed actions: `start`, `suspend`, `resume`, `cancel`
- Typed functions: `getAttributes`, `getOutputs`, `getInstancesByBusinessKey`
- A process definition JSON in `./srv/workflows/`

After importing, run `cds-typer` to generate TypeScript types for the imported service.

#### Starting a Process

```typescript
import ShipmentHandlerService from '#cds-models/eu12/myorg/myproject/ShipmentHandlerService';

const processService = await cds.connect.to(ShipmentHandlerService);

await processService.start({
  businesskey: 'order-12345',
  startingShipment: {
    identifier: 'shipment_001',
    items: [{ identifier: 'item_1', title: 'Laptop', quantity: 1, price: 1200.0 }],
  },
});
```

The `start` action accepts a typed `ProcessInputs` object that matches the process definition's input schema. The plugin validates inputs against the process definition at build time.

#### Suspending, Resuming, and Cancelling a Process

```typescript
// Suspend all running instances for a business key
await processService.suspend({ businessKey: 'order-12345', cascade: false });

// Resume all suspended instances for a business key
await processService.resume({ businessKey: 'order-12345', cascade: false });

// Cancel all running/suspended instances for a business key
await processService.cancel({ businessKey: 'order-12345', cascade: false });
```

The `cascade` parameter is optional and defaults to `false`. When set to `true`, child process instances are also affected.

#### Querying Process Instances

```typescript
// Get all instances matching a business key, optionally filtered by status
const instances = await processService.getInstancesByBusinessKey({
  businessKey: 'order-12345',
  status: ['RUNNING', 'SUSPENDED'],
});

// Get attributes for a specific process instance
const attributes = await processService.getAttributes({
  processInstanceId: 'instance-uuid',
});

// Get outputs for a specific process instance
const outputs = await processService.getOutputs({
  processInstanceId: 'instance-uuid',
});
```

Valid status values are: `RUNNING`, `SUSPENDED`, `CANCELLED`, `ERRONEOUS`, `COMPLETED`.
If no status filter is provided, all statuses except `CANCELLED` are returned.

#### Limitations

- The typed process service does not currently support local development.
- The process import is currently only possible via the command line.

### Generic ProcessService

The generic `ProcessService` is a built-in CDS service that ships with the plugin. It provides low-level events and functions for managing workflow instances without requiring any process imports. This is useful for quick prototyping, dynamic process management, or cases where type safety is not needed.
The generic `ProcessService` allows setting the business key to mimic the behavior of the real SBPA workflow. The business key in the header is only used when the application runs locally, so to avoid issues, the business key should be built the same way as in the actual process.

#### Service Definition

The generic `ProcessService` defines the following events and functions:

| Operation                   | Type     | Description                                                       |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| `start`                     | event    | Start a workflow instance with a `definitionId` and `context`     |
| `cancel`                    | event    | Cancel all running/suspended instances matching a `businessKey`   |
| `suspend`                   | event    | Suspend all running instances matching a `businessKey`            |
| `resume`                    | event    | Resume all suspended instances matching a `businessKey`           |
| `getAttributes`             | function | Retrieve attributes for a specific process instance               |
| `getOutputs`                | function | Retrieve outputs for a specific process instance                  |
| `getInstancesByBusinessKey` | function | Find process instances by business key and optional status filter |

#### Usage

```typescript
const processService = await cds.connect.to('ProcessService');

// Start a process
await processService.emit('start', {
  definitionId: 'eu12.myorg.myproject.myProcess',
  context: { orderId: '12345', amount: 100.0 },
});

// Start a process with local businessKey
await processService.emit('start', {
  definitionId: 'eu12.myorg.myproject.myProcess',
  context: { orderId: '12345', amount: 100.0 },
  {orderId}, // orderId -> "order-12345"
})

// Cancel all running instances for a business key
await processService.emit('cancel', {
  businessKey: 'order-12345',
  cascade: false,
});

// Suspend running instances
await processService.emit('suspend', {
  businessKey: 'order-12345',
  cascade: false,
});

// Resume suspended instances
await processService.emit('resume', {
  businessKey: 'order-12345',
  cascade: false,
});

// Query instances by business key
const instances = await processService.send('getInstancesByBusinessKey', {
  businessKey: 'order-12345',
  status: ['RUNNING', 'SUSPENDED'],
});

// Get attributes of a specific instance
const attributes = await processService.send('getAttributes', {
  processInstanceId: 'instance-uuid',
});

// Get outputs of a specific instance
const outputs = await processService.send('getOutputs', {
  processInstanceId: 'instance-uuid',
});
```

> **Note:** The generic ProcessService uses `emit` for lifecycle events (start, cancel, suspend, resume) which are processed asynchronously through the CDS outbox, and `send` for query functions (getAttributes, getOutputs, getInstancesByBusinessKey) which return data synchronously.
> Make sure to check whether the outbox is correctly used. If not, refer to cds.queued to make sure it is used.

## Build-Time Validation

Validation occurs during `cds build` and produces **errors** (hard failures that stop the build) or **warnings** (soft failures that are logged but don't stop the build).

### Process Start

#### Required Annotations (Errors)

- `@bpm.process.start.id` and `@bpm.process.start.on` are mutually required — if one is present, the other must also be present
- `@bpm.process.start.id` must be a string
- `@bpm.process.start.on` must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@bpm.process.start.if` must be a valid CDS expression (if present)

#### Warnings

- Unknown annotations under `@bpm.process.start.*` trigger a warning listing allowed annotations
- If no imported process definition is found for the given `id`, a warning is issued as input validation is skipped

#### Input Validation (when process definition is found)

When both `@bpm.process.start.id` and `@bpm.process.start.on` are present and the process definition is imported:

**Errors:**

- Entity attributes specified in `@bpm.process.start.inputs` (or all direct attributes if `inputs` is omitted) must exist in the process definition inputs
- Mandatory inputs from the process definition must be present in the entity

**Warnings:**

- Type mismatches between entity attributes and process definition inputs
- Array cardinality mismatches (entity is array but process expects single value or vice versa)
- Mandatory flag mismatches (process input is mandatory but entity attribute is not marked as `@mandatory`)

### Process Cancel/Suspend/Resume

#### Required Annotations (Errors)

- `@bpm.process.<cancel|suspend|resume>.on` is required for cancel/suspend/resume operations and must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@bpm.process.<cancel|suspend|resume>.cascade` is optional (defaults to false); if provided, must be a boolean
- `@bpm.process.<cancel|suspend|resume>.if` must be a valid CDS expression (if present)
- If any annotation with `@bpm.process.<cancel|suspend|resume>` is defined, a valid business key expression must be defined using `@bpm.process.businessKey`.
  - Example: `@bpm.process.businessKey: (id || '-' || name)` would concatenate `id` and `name` with a `-` separator as a business key.
  - The business key definition must match the one configured in the SBPA Process Builder.

#### Warnings

- Unknown annotations under `@bpm.process.<cancel|suspend|resume>.*` trigger a warning listing allowed annotations

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports, etc. via [GitHub issues](https://github.com/cap-js/<your-project>/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure

If you find any bug that may be a security problem, please follow the instructions in our [security policy](https://github.com/cap-js/<your-project>/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright (20xx-)20xx SAP SE or an SAP affiliate company and <your-project> contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cap-js/<your-project>).
