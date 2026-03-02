# Setup

### Execute following commands install dependencies after cloning the project:
````
npm install
npm i -g tsx
npm run build
````
### To run the sample application, execute:
````
cd /tests/bookshop
cds watch
````

# Current annotation implementation:

## For starting a process:

- `@build.process.start` -- Start a process (or classic workflow), either after entity creation, update, deletion, or any custom action including all entity elements unless at least one `@build.process.input` is given
  - if no attribute is annotated with`@build.process.input`, all attributes of that entity will be fetched and are part of the context for process input. Associations will not be expanded in that case
  - `@build.process.start.id` -- definition ID for deployed process
  - `@build.process.start.on`
  - `@build.process.start.if` -- only starting process if expression is true
- `@build.process.input` -- includes this element in the process start assuming name equality
- `@(build.process.input: 'targetVariable')` -- includes this element in the process start and maps 1:1 to target variable
- Important: the process that has been started needs to have an input attribute 'businesskey' of type string that is then assigned to the businessKey in process configuration so that the process can be later CANCELLED/SUSPENDED/RESUMED

Example:

```cds
service MyService {

    @build.process.start: {
        id: '<projectId>.<processId>',
        on: 'CREATE | UPDATE | DELETE | boundAction',
        when: (<expression>)
    }
    entity MyProjection as projection on MyEntity {
      myElement @build.process.input,
      myElement2 @(build.process.input: 'targetVariable')
      myElement3
    };

}

```

## For cancelling/resuming/suspending a process

- `@build.process.<cancel|resume|suspend>` -- Cancel/Suspend/Resume any processes bound to the entity (using entityKey as businessKey in SBPA)
  - `@build.process.<cancel|resume|suspend>.on`
  - `@build.process.<cancel|resume|suspend>.cascade` -- boolean (optional, defaults to false)
  - `@build.process.<cancel|resume|suspend>.if` -- only starting process if expression is true
    - example: `@build.process.suspend.if: (weight > 10)`

Example:

```cds
service MyService {

    @build.process.<cancel|suspend|resume>: {
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

- `@build.process.start.id` and `@build.process.start.on` are mutually required — if one is present, the other must also be present
- `@build.process.start.id` must be a string
- `@build.process.start.on` must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@build.process.start.if` must be a valid CDS expression (if present)

### Warnings

- Unknown annotations under `@build.process.start.*` trigger a warning listing allowed annotations
- If no imported process definition is found for the given `id`, a warning is issued as input validation is skipped

### Input Validation (when process definition is found)

When both `@build.process.start.id` and `@build.process.start.on` are present and the process definition is imported:

**Errors:**

- The process definition must have a `businesskey` input
- Entity attributes marked with `@build.process.input` (or all attributes if none are marked) must exist in the process definition inputs
- Mandatory inputs from the process definition must be present in the entity

**Warnings:**

- Type mismatches between entity attributes and process definition inputs
- Array cardinality mismatches (entity is array but process expects single value or vice versa)
- Mandatory flag mismatches (process input is mandatory but entity attribute is not marked as `@mandatory`)

**Note:** Associations and compositions are recursively validated, and cycles in entity associations are detected and reported as errors.

## Process Cancel/Suspend/Resume

### Required Annotations (Errors)

- `@build.process.<cancel|suspend|resume>.on` is required for cancel/suspend/resume operations and must be a string representing either:
  - A CRUD operation: `CREATE`, `READ`, `UPDATE`, or `DELETE`
  - A bound action defined on the entity
- `@build.process.<cancel|suspend|resume>.cascade` is optional (defaults to false); if provided, must be a boolean
- `@build.process.<cancel|suspend|resume>.if` must be a valid CDS expression (if present)

### Warnings

- Unknown annotations under `@build.process.<cancel|suspend|resume>.*` trigger a warning listing allowed annotations

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

# cap-js Repository Template

Default templates for @cap-js open source [CAP Calesi](https://cap.cloud.sap/docs/about/best-practices#the-calesi-pattern) plugins. It includes a sample plugin and the basic setup needed to start with development. All repositories on github.com/cap-js will be created based on this template.

## To-Do

In case you are the maintainer of a new @cap-js open source CAP plugin, these are the steps to do with the template files:

- Check if the default license (Apache 2.0) also applies to your project. A license change should only be required in exceptional cases. If this is the case, please change it.
- Enter the correct metadata for the REUSE tool. Please replace the parts inside the single angle quotation marks < > by the specific information for your repository and be sure to run the REUSE tool to validate that the metadata is correct.
- Adjust the contribution guidelines (e.g. add coding style guidelines, pull request checklists, different license if needed etc.)
- Add information about your project to this README (name, description, requirements etc). Especially take care for the <your-project> placeholders - those ones need to be replaced with your project name. See the sections below the horizontal line.
- Setup your GitHub repository:
  - Add the GitHub protection rules for you repository:
    - Go to Settings > Rules > Rulesets > New ruleset > Import from json
    - Upload the file `gh_ruleset.json`. You can delete it in your repository afterwards
  - Add collaborators to your repository:
    - Maximilian Eckert (maxieckert-sap) as Admin
    - `cdsmunich`-Team as Maintainer
  - Create a label with the name `no changelog`. If you want to skip the check for changelog entries in your PR, you can add this label.
- Adjust the name of your plugin in the needed places (Search for `REPO-NAME` and replace it with your plugin name)
- Start developing your new CAP plugin!
  - Adjust the sample `cds-plugin.js` file
  - Adjust the sample service implementations in `lib`
  - Adjust the sample test application in `tests/bookshop` to show the usage of your plugin
- Remove all content in this README above and including the horizontal line ;)

---

# Our new open source project

## About this project

_Insert a short description of your project here..._

## Requirements and Setup

_Insert a short description what is required to get your project running..._

## Tests

In `tests/bookshop/` you can find a sample application that is used to demonstrate how to use the plugin and to run tests against it.

### Local Testing

To execute local tests, simply run:

```bash
npm run test
```

For tests, the `cds-test` Plugin is used to spin up the application. More information about `cds-test` can be found [here](https://cap.cloud.sap/docs/node.js/cds-test).

### Hybrid Testing

#### Local

In the case of hybrid tests (i.e., tests that run with a real BTP service), you can bind the service instance to the local application like this:

```bash
cds bind -2 my-service
```

More on `cds bind` can be found [here](https://pages.github.tools.sap/cap/docs/advanced/hybrid-testing#cds-bind-usage)

The hybrid integration tests can be run via:

```bash
npm run test:hybrid
```

#### CI

For CI, the service binding is added during the action run. Uncomment the _Bind against BTP services_ and _BTP Auth_ sections in the file `.github/actions/integration-tests/action.yml` and adjust the service name/names accordingly. The `cds bind` command executed there will be the almost the same as done locally before, with the difference that it will be written to package.json in CI.

You can also execute the tests against a HANA Cloud instance. For that, add the commented sections in the action file and adjust accordingly.

## Support, Feedback, Contributing

This project is open to feature requests/suggestions, bug reports etc. via [GitHub issues](https://github.com/cap-js/<your-project>/issues). Contribution and feedback are encouraged and always welcome. For more information about how to contribute, the project structure, as well as additional contribution information, see our [Contribution Guidelines](CONTRIBUTING.md).

## Security / Disclosure

If you find any bug that may be a security problem, please follow our instructions at [in our security policy](https://github.com/cap-js/<your-project>/security/policy) on how to report it. Please do not create GitHub issues for security-related doubts or problems.

## Code of Conduct

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone. By participating in this project, you agree to abide by its [Code of Conduct](https://github.com/cap-js/.github/blob/main/CODE_OF_CONDUCT.md) at all times.

## Licensing

Copyright (20xx-)20xx SAP SE or an SAP affiliate company and <your-project> contributors. Please see our [LICENSE](LICENSE) for copyright and license information. Detailed information including third-party components and their licensing/copyright information is available [via the REUSE tool](https://api.reuse.software/info/github.com/cap-js/<your-project>).
