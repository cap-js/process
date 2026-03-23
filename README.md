[![REUSE status](https://api.reuse.software/badge/github.com/cap-js/process)](https://api.reuse.software/info/github.com/cap-js/process)

# Setup

## Run the sample in the Plugin

Make sure to follow https://cap.cloud.sap/docs/get-started/ to install global dependencies that are required for CAP application development.

Install the dependencies for the plugin and build the project:

```
npm run i
npm run build
```

### Running the bookshop example

Using cds-tsx:

```
npm i -g tsx
cd tests/bookshop && npm run build
cd tests/bookshop && cds-tsx w
```

Using cds watch:

```
npm run compile
cd tests/bookshop && npm run build
cd tests/bookshop && cds watch
```

### Troubleshooting

`npm run clean:all` cleans all generated files and rebuilds them
`npm run clean:build` cleans the build files and rebuilds them
`npm run clean:types` cleans the generated cds-typer files and rebuilds them

## To use the plugin as a CAP developer

To add the plugin to your CAP Node.js application, run:

```
npm run add @cap-js/process
```

### Binding against SBPA instance

Binding is not necessary for trying out the plugin locally.
The annotation and programmatic approaches against the generic ProcessService work without any bindings against SBPA.

Login to Cloud Foundry:

```
cf login --sso
```

Bind to a ProcessService instance:

```
  cds bind ProcessService -2 <sbpa-service-instance>
```

This will create a `cdsrc-private.json` file containing the credentials.

### Importing Processes as a Service

The plugin allows you to import existing SBPA processes as CDS services. To do so, you first need to bind against an existing SBPA instance.
Imported processes ensure type safety and enable build-time validation.
Without importing a specific process, the programmatic approach is still possible through the generic ProcessService.
However, build-time validation will not check whether all mandatory inputs required to start a process are provided.

```
cds bind --exec -- cds-tsx import --from process --name <Process_ID>
```

# Annotations

Important: For process events defined on the `DELETE` operation, a `before` handler fetches the entity that will be deleted and stores it in `req._Process.[Start|Suspend|Resume|Cancel]` so that it can be used in the `service.after` handler.

## For starting a process

- `@bpm.process.start` -- Start a process (or classic workflow) after entity creation, update, deletion, read, or any custom action, including all entity elements unless at least one `@bpm.process.start.inputs` entry is given
  - If no attribute is annotated with `@bpm.process.input`, all attributes of that entity will be fetched and included as process input context. Associations will not be expanded in that case.
  - `@bpm.process.start.id` -- definition ID for deployed process
  - `@bpm.process.start.on`
  - `@bpm.process.start.if` -- Only start the process if the expression evaluates to true
- `@bpm.process.start.inputs` -- Array of input mappings that control which entity fields are passed as process context (optional)
- If a `businessKey` is annotated on the entity using `@bpm.process.businessKey`, it will be evaluated at process start. If the length of the business key exceeds SBPA's character limit of 255, the request will be rejected, as process start will fail in that case.

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

### Complete Example

```cds
service MyService {

    @bpm.process.start: {
        id: '<projectId>.<processId>',
        on: 'CREATE | UPDATE | DELETE | boundAction',
        if: (<expression>),
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

## For cancelling, resuming, or suspending a process

- `@bpm.process.<cancel|resume|suspend>` -- Cancel/Suspend/Resume any processes bound to the entity (using the entity key as business key in SBPA)
  - `@bpm.process.<cancel|resume|suspend>.on`
  - `@bpm.process.<cancel|resume|suspend>.cascade` -- Boolean (optional, defaults to false)
  - `@bpm.process.<cancel|resume|suspend>.if` -- Only trigger the action if the expression evaluates to true
    - Example: `@bpm.process.suspend.if: (weight > 10)`
- For cancelling, resuming, or suspending, it is required to have a business key expression annotated on the entity using `@bpm.process.businessKey`. If no business key is annotated, the request will be rejected.
  - Example: `@bpm.process.businessKey: (id || '-' || name)`

Example:

```cds
service MyService {

    @bpm.process.<cancel|suspend|resume>: {
        on: 'CREATE | UPDATE | DELETE | boundAction',
        cascade: true | false,  // optional, defaults to false
        when: (<expression>)
    }
    entity MyProjection as projection on MyEntity {
      myElement,
      myElement2,
      myElement3
    };

}

```

# Build-Time Validation

Validation occurs during `cds build` and produces **errors** (hard failures that stop the build) or **warnings** (soft failures that are logged but don't stop the build).

## Process Start

### Required Annotations (Errors)

- `@bpm.process.start.id` and `@bpm.process.start.on` are mutually required — if one is present, the other must also be present
- `@bpm.process.start.id` must be a string
- `@bpm.process.start.on` must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@bpm.process.start.if` must be a valid CDS expression (if present)

### Warnings

- Unknown annotations under `@bpm.process.start.*` trigger a warning listing allowed annotations
- If no imported process definition is found for the given `id`, a warning is issued as input validation is skipped

### Input Validation (when process definition is found)

When both `@bpm.process.start.id` and `@bpm.process.start.on` are present and the process definition is imported:

**Errors:**

- The process definition must have a `businesskey` input
- Entity attributes specified in `@bpm.process.start.inputs` (or all direct attributes if `inputs` is omitted) must exist in the process definition inputs
- Mandatory inputs from the process definition must be present in the entity

**Warnings:**

- Type mismatches between entity attributes and process definition inputs
- Array cardinality mismatches (entity is array but process expects single value or vice versa)
- Mandatory flag mismatches (process input is mandatory but entity attribute is not marked as `@mandatory`)

**Note:** Associations and compositions are recursively validated, and cycles in entity associations are detected and reported as errors.

## Process Cancel/Suspend/Resume

### Required Annotations (Errors)

- `@bpm.process.<cancel|suspend|resume>.on` is required for cancel/suspend/resume operations and must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@bpm.process.<cancel|suspend|resume>.cascade` is optional (defaults to false); if provided, must be a boolean
- `@bpm.process.<cancel|suspend|resume>.if` must be a valid CDS expression (if present)
- If any annotation with `@bpm.process.<cancel|suspend|resume>` is defined, a valid business key expression must be defined using `@bpm.process.businessKey`.
  - Example: `@bpm.process.businessKey: (id || '-' || name)` would concatenate `id` and `name` with a `-` separator as a business key.
  - The business key definition must match the one configured in the SBPA Process Builder.

### Warnings

- Unknown annotations under `@bpm.process.<cancel|suspend|resume>.*` trigger a warning listing allowed annotations

# Programmatic Approach

The plugin provides two ways to interact with SBPA processes programmatically:

1. **Imported Process Services** -- Import a specific SBPA process to get a typed CDS service with full type safety and build-time validation.
2. **Generic ProcessService** -- Use the built-in `ProcessService` directly for untyped, flexible process management without importing a specific process.

Both approaches work locally (in-memory), in hybrid mode (against a real SBPA instance), and in production.

## Generic ProcessService

The generic `ProcessService` is a built-in CDS service that ships with the plugin. It provides low-level events and functions for managing workflow instances without requiring any process imports. This is useful for quick prototyping, dynamic process management, or cases where type safety is not needed.

The `ProcessService` is automatically configured based on the CDS profile:

- **Development**: Uses an in-memory local workflow store (no credentials needed)
- **Hybrid**: Connects to a real SBPA instance via `cds bind`
- **Production**: Connects to SBPA through VCAP service bindings

### Service Definition

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

### Usage

```typescript
const processService = await cds.connect.to('ProcessService');

// Start a process
await processService.emit('start', {
  definitionId: 'eu12.myorg.myproject.myProcess',
  context: { orderId: '12345', amount: 100.0 },
});

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

## Imported Process Services (Typed)

For full type safety and build-time validation, you can import a specific SBPA process. This generates a typed CDS service with input/output types derived from the process definition.

### Importing a Service

To import a process, you need credentials via `cds bind` and must be logged in to Cloud Foundry.

#### From SBPA (Remote Import)

Import your SBPA process directly from the API:

**Note:** For remote imports, you must have ProcessService credentials bound (e.g., via `cds bind process -2 <instance>`). The plugin will automatically resolve the bindings at import time.

```bash
cds bind --exec -- cds-tsx import --from process --name eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler --no-copy
```

If you want to have it as a cds instead of a csn you can add --as cds at the end. If you want to reimport the process use the --force flag at the end. The flag `no-copy` is very important, as otherwise the process will be saved locally on both `./workflows`and `./srv/external` folder which would result in cds runtime issues, as the json is not a valid csn model and cannot be stored in the `.srv/external` directory.

#### From Local JSON File

If you already have a process definition JSON file (e.g., exported or previously fetched), you can generate the CDS model directly from it without needing credentials:

```bash
cds import --from process ./workflows/eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler.json --no-copy
```

### What Gets Generated

The import generates:

- A CDS service definition in `./workflows/`
- Types via `cds-typer` for full TypeScript support
- Generic handlers for the actions and functions in the imported service

## For starting a process

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

### Suspending, Resuming, and Cancelling a Process

```typescript
// Suspend all running instances for a business key
await processService.suspend({ businessKey: 'order-12345', cascade: false });

// Resume all suspended instances for a business key
await processService.resume({ businessKey: 'order-12345', cascade: false });

// Cancel all running/suspended instances for a business key
await processService.cancel({ businessKey: 'order-12345', cascade: false });
```

The `cascade` parameter is optional and defaults to `false`. When set to `true`, child process instances are also affected.

### Querying Process Instances

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

Valid status values are: `RUNNING`, `SUSPENDED`, `CANCELED`, `ERRONEOUS`, `COMPLETED`.
If no status filter is provided, all statuses except `CANCELED` are returned.

# CAP - Process Plugin

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports, etc. via [GitHub issues](https://github.com/cap-js/<your-project>/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure

If you find any bug that may be a security problem, please follow the instructions in our [security policy](https://github.com/cap-js/<your-project>/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright (20xx-)20xx SAP SE or an SAP affiliate company and <your-project> contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cap-js/<your-project>).
