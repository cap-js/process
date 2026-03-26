# Status Management Bookshop

A CAP sample application demonstrating how to integrate SAP Build Process Automation (SBPA) workflows into a bookshop scenario using the `@cap-js/process` plugin. The project showcases two distinct integration patterns -- **declarative** and **programmatic** -- for managing process lifecycles.

## Overview

The application consists of two SAP Fiori Elements apps, each backed by its own CAP service:

| App                | Service          | Path           | Purpose                                                                      |
| ------------------ | ---------------- | -------------- | ---------------------------------------------------------------------------- |
| **Manage Books**   | `BooksService`   | `/api/books`   | CRUD for books with an approval workflow triggered when the price exceeds 50 |
| **Manage Authors** | `AuthorsService` | `/api/authors` | CRUD for authors with a verification workflow triggered on every new author  |

A third read-only service (`CatalogService` at `/browse`) exposes books for public browsing.

Both apps are accessible from a shared **Fiori Launchpad sandbox** at `/fiori.html`.

## Processes

<details> 
<summary>
Book approval process
</summary>

```
              ┌────────────────────────────────────────┐
              │              Process Start             │
              └───────────────────┬────────────────────┘
                                  │
              ┌───────────────────▼────────────────────┐
              │   Set status to 'Manager Approval      │
              │               Pending'                 │
              └───────────────────┬────────────────────┘
                                  │
              ┌───────────────────▼────────────────────┐
              │            Manager Approval            │
              └──────────────┬──────────────┬──────────┘
                             │              │
                        [Approve]        [Reject]
                             │              │
              ┌──────────────▼────────┐  ┌──▼──────────────────────────┐
              │ status = 'Manager     │  │ status = 'Manager rejected  │
              │ Approved, Author      │  │ request'                    │
              │ Approval Pending'     │  │ isApproved = false          │
              └──────────────┬────────┘  └──┬──────────────────────────┘
                             │              │
              ┌──────────────▼────────┐     │
              │    Author Approval    │     │
              └──────┬───────────┬────┘     │
                     │           │          │
                [Approve]     [Reject]      │
                     │           │          │
   ┌─────────────────▼───┐  ┌────▼──────────────────────────┐
   │ status = 'Manager   │  │ status = 'Manager approved,   │
   │ and Author          │  │ but Author rejected request'  │
   │ Approved'           │  │ isApproved = false            │
   │ isApproved = true   │  └────┬──────────────────────────┘
   └─────────────────┬───┘       │          │
                     └─────┬─────┘          │
                           │                │
                           └────────┬───────┘
                                    │
                         ┌──────────▼──────────┐
                         │         End         │
                         └─────────────────────┘
```

</details>

<details>

<summary>
Author verification process
</summary>

```
          ┌─────────────────────────────────────────┐
          │             Process Start               │
          └──────────────────┬──────────────────────┘
                             │
          ┌──────────────────▼──────────────────────┐
          │   status = "Verification Pending"       │
          └──────────────────┬──────────────────────┘
                             │
          ┌──────────────────▼──────────────────────┐
          │       Author Verification Approval      │
          └──────────┬──────────────────────┬───────┘
                     │                      │
                 [Verify]               [Reject]
                     │                      │
     ┌───────────────▼──────────┐  ┌────────▼────────────────────┐
     │ status = "Author         │  │ status = "Author was not    │
     │          verified"       │  │          verified"          │
     │ isVerified = true        │  │ isVerified = false          │
     └───────────────┬──────────┘  └────────┬────────────────────┘
                     │                      │
                     └──────────┬───────────┘
                                │
          ┌─────────────────────▼─────────────────────┐
          │                   End                     │
          └───────────────────────────────────────────┘
```

</details>

## Project Structure

```

db/
schema.cds # Domain model: Books, Authors, Genres
data/ # CSV seed data
srv/
books-service.cds # BooksService definition
books-service.js # Books handler: approval status enrichment
books-constraints.cds # Input validation for Books and Genres
authors-service.cds # AuthorsService definition
authors-service.js # Authors handler: verification lifecycle + status enrichment
authors-constraints.cds # Input validation for Authors
admin-process.cds # Declarative BPM annotations for Books
cat-service.cds # CatalogService (read-only browse)
cat-service.js # CatalogService handler
external/ # Generated process service definitions (do not edit)
app/
fiori.html # Local Fiori Launchpad sandbox
services.cds # Imports annotations from both apps
books/ # Fiori Elements app for Manage Books
authors/ # Fiori Elements app for Manage Authors

```

## How the `@cap-js/process` Plugin Is Used

The [`@cap-js/process`](https://github.com/cap-js/process) plugin provides a CAP-native way to interact with SAP Build Process Automation. It generates typed service definitions from SBPA process definitions and offers both declarative CDS annotations and a programmatic API for managing process instances.

### Pattern 1: Declarative Process Integration (Books)

The book approval process is managed entirely through CDS annotations in `srv/books-process.cds`, with no JavaScript needed for start/cancel:

```cds
annotate BooksService.Books with @(
    bpm.process.businessKey: (title),
    bpm.process.start : {
        id: 'eu12...bookApprovalProcess',
        on: 'CREATE',
        inputs: [
            { path: $self.title, as: 'booktitle' },
            { path: $self.descr, as: 'description' },
            $self.author.name,
            $self.author.dateOfBirth,
            $self.price,
        ],
        if: (price > 50)
    },
    bpm.process.cancel : {
        on: 'UPDATE',
        if: (price <= 50)
    }
);
```

- **`@bpm.process.businessKey`** -- Correlates process instances back to entities using the book title.
- **`@bpm.process.start`** -- Automatically starts the approval process on `CREATE` when the price exceeds 50. Entity fields are mapped to process inputs, with support for renaming (`as`) and navigation paths (`$self.author.name`).
- **`@bpm.process.cancel`** -- Automatically cancels the running process on `UPDATE` when the price drops to 50 or below.

### Pattern 2: Programmatic Process Integration (Authors)

The author verification process is managed entirely in JavaScript (`srv/authors-service.js`), giving full control over the lifecycle:

```js
// Start verification on author creation
this.after('CREATE', 'Authors', async (author, req) => {
  const verificationService = await cds.connect.to(AUTHOR_PROCESS);
  await verificationService.start({
    authorname: author.name,
    dateofbirth: author.dateOfBirth ?? '',
    placeofbirth: author.placeOfBirth ?? '',
  });
});

// Cancel verification on author deletion
this.after('DELETE', 'Authors', async (author, req) => {
  const verificationService = await cds.connect.to(AUTHOR_PROCESS);
  const instances = await verificationService.getInstancesByBusinessKey(author.name, ['RUNNING']);
  if (instances.length > 0) {
    await verificationService.cancel({ businessKey: author.name, cascade: true });
  }
});
```

### Process Status Enrichment (Both Apps)

Both services use the same pattern to display live process status in the UI. Virtual fields (`processStatus`, `isApproved`, `processCriticality` for Books; `verificationStatus`, `isVerified`, `verificationCriticality` for Authors) are declared in the CDS projections and populated in `after('READ')` handlers:

1. **Look up** the process instance via `getInstancesByBusinessKey(businessKey, statusFilters)`
2. **Based on status:**
   - `RUNNING` -- Fetch current step via `getAttributes(instanceId)`
   - `COMPLETED` -- Fetch final result via `getOutputs(instanceId)`
   - `CANCELED` -- Show cancellation message
3. **Set criticality** for Fiori UI coloring (0 = neutral, 1 = negative/red, 2 = warning/yellow, 3 = positive/green)

### Declarative vs Programmatic: When to Use Which

| Aspect               | Declarative (Books)                               | Programmatic (Authors)                                         |
| -------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Process start        | CDS annotation `@bpm.process.start`               | `processService.start(inputs)` in JS                           |
| Process cancel       | CDS annotation `@bpm.process.cancel`              | `processService.cancel(options)` in JS                         |
| Conditional triggers | CDS expression: `if: (price > 50)`                | Custom JS logic                                                |
| Input mapping        | Declarative `inputs` array with `path`/`as`       | Manual JS object construction                                  |
| Best for             | Standard workflows with simple trigger conditions | Complex logic, custom error handling, multi-step orchestration |

## Getting Started

### Prerequisites

- Node.js >= 18
- SAP CDS CLI (`npm i -g @sap/cds-dk`)

### Install and Run

```sh
npm install
cds watch
```

Open http://localhost:4004 in your browser. From there:

- **Fiori Launchpad**: http://localhost:4004/fiori.html (both apps as tiles)
- **Manage Books**: http://localhost:4004/books/index.html
- **Manage Authors**: http://localhost:4004/authors/index.html

### Hybrid Testing with SBPA

To test against a real SAP Build Process Automation instance, configure the binding in `.cdsrc-private.json` and run:

```sh
cds watch --profile hybrid
```

For more information how to setup the plugin, please refer to the [plugins documentation](https://github.com/cap-js/process).
