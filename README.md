# Setup

### Execute following commands to install dependencies after cloning the project:

Make sure to follow https://cap.cloud.sap/docs/get-started/ to install global dependencies that are required for CAP aplication development.

```
npm install
npm i -g tsx
npm run build
```

### To run the sample application, execute:

```
cd /tests/bookshop
cds watch
```

## To use the plugin as a CAP developer:

- (in future): run `npm add @cap-js/process`
  - before first release: `npm add git+https://github.com/cap-js/process.git`
- Login to cf `cf login ...`
- Bind to process service instance:
  - `cds bind ProcessService -to <sbpa-service-instance>`

Start developing 🙂

# Current annotation implementation:

## For starting a process:

- `@bpm.process.start` -- Start a process (or classic workflow), either after entity creation, update, deletion, read, or any custom action including all entity elements unless at least one `@bpm.process.input` is given
  - if no attribute is annotated with`@bpm.process.input`, all attributes of that entity will be fetched and are part of the context for process input. Associations will not be expanded in that case
  - `@bpm.process.start.id` -- definition ID for deployed process
  - `@bpm.process.start.on`
  - `@bpm.process.start.if` -- only starting process if expression is true
- `@bpm.process.input` -- includes this element in the process start assuming name equality
- `@(bpm.process.input: 'targetVariable')` -- includes this element in the process start and maps 1:1 to target variable
- Important: the process that has been started needs to have an input attribute 'businesskey' of type string that is then assigned to the businessKey in process configuration so that the process can be later CANCELLED/SUSPENDED/RESUMED

Example:

```cds
service MyService {

    @bpm.process.start: {
        id: '<projectId>.<processId>',
        on: 'CREATE | UPDATE | DELETE | boundAction',
        when: (<expression>)
    }
    entity MyProjection as projection on MyEntity {
      myElement @bpm.process.input,
      myElement2 @(bpm.process.input: 'targetVariable')
      myElement3
    };

}

```

## For cancelling/resuming/suspending a process

- `@bpm.process.<cancel|resume|suspend>` -- Cancel/Suspend/Resume any processes bound to the entity (using entityKey as businessKey in SBPA)
  - `@bpm.process.<cancel|resume|suspend>.on`
  - `@bpm.process.<cancel|resume|suspend>.cascade` -- boolean (optional, defaults to false)
  - `@bpm.process.<cancel|resume|suspend>.if` -- only starting process if expression is true
    - example: `@bpm.process.suspend.if: (weight > 10)`

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

# Current build time validation

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
- Entity attributes marked with `@bpm.process.input` (or all attributes if none are marked) must exist in the process definition inputs
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

### Warnings

- Unknown annotations under `@bpm.process.<cancel|suspend|resume>.*` trigger a warning listing allowed annotations

# Current programmatic approach

## Importing a Service

To use the programmatic approach with types, you need to import an existing SBPA process. This requires credentials via `cds bind` and being logged in to Cloud Foundry.

### From SBPA (Remote Import)

Import your SBPA process directly from the API:

**Note:** For remote imports, you must have ProcessService credentials bound. Run with `cds bind --exec` if needed:

```bash
cds bind --exec -- cds-tsx import --from process --name eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler --no-copy
```

If you want to have it as a cds instead of a csn you can add --as cds at the end. If you want to reimport the process use the --force flag at the end. The flag `no-copy` is very important, as otherwise the process will be saved locally on both `./workflows`and `./srv/external` folder which would result in cds runtime issues, as the json is not a valid csn model and cannot be stored in the `.srv/external` directory.

### From Local JSON File

If you already have a process definition JSON file (e.g., exported or previously fetched), you can generate the CSN model directly from it without needing credentials:

```bash
cds import --from process ./workflows/eu12.bpm-horizon-walkme.sdshipmentprocessor.shipmentHandler.json --no-copy
```

### What Gets Generated

This will generate:

- A CDS service definition in `./workflows/`
- Types via `cds-typer` for full TypeScript support
- Generic handlers for the actions and functions in the imported service

## For starting a process

```typescript
const processService = await cds.connect.to(ShipmentHandlerService);

const processInstance = await processService.start({
  businesskey: 'order-12345',
  startingShipment: {
    identifier: 'shipment_001',
    items: [{ identifier: 'item_1', title: 'Laptop', quantity: 1, price: 1200.0 }],
  },
});
```

## For suspending/resuming/cancelling a process

```typescript
// Suspend
await processService.suspend({ businessKey: 'order-12345', cascade: false });

// Resume
await processService.resume({ businessKey: 'order-12345', cascade: false });

// Cancel
await processService.cancel({ businessKey: 'order-12345', cascade: false });
```

## For getAttributes and getOutputs

### Missing

```typescript
const attributes = await processService.getAttributes({ processInstanceId: 'instance-uuid' });

const outputs = await processService.getOutputs({ processInstanceId: 'instance-uuid' });
```

# CAP - Process Plugin

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/cap-js/<your-project>/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure

If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/cap-js/<your-project>/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright (20xx-)20xx SAP SE or an SAP affiliate company and <your-project> contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cap-js/<your-project>).
