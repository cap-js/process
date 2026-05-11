# Change Log

- All notable changes to this project are documented in this file.
- The format is based on [Keep a Changelog](https://keepachangelog.com/).
- This project adheres to [Semantic Versioning](https://semver.org/).

## Version 0.3.0 - 2026-05-11

### Added

- `getInstances` function replacing `getInstancesByBusinessKey` — supports filtering by all SBPA workflow instance query parameters: `id`, `businessKey`, `status`, `definitionId`, `definitionVersion`, `startedAt`, `startedFrom`, `startedUpTo`, `completedAt`, `completedFrom`, `completedUpTo`, `startedBy`, `subject`, `containsText`, `rootInstanceId`, `parentInstanceId`, `orderBy`, `top`, `skip`, `inlinecount`

### Changed

- `getInstancesByBusinessKey` is replaced by `getInstances` in both the specific process services and the generic `ProcessService`

## Version 0.2.1 - 2026-04-20

### Fixed

- Resolving of `impl` for `ProcessService`

## Version 0.2.0 - 2026-04-02

### Added

- Reducing the context sent to the workflow API to only needed fields
- Allowing the import of downloaded process models
- Support for multiple start annotations on the same entity using qualifier
- Support for multiple resume, cancel, and suspend annotations on the same entity using qualifier
- Support for multiple businessKey annotations on the same entity using qualifier

## Version 0.1.1 - 2026-03-27

### Fixed

- Resolving of Cloud credentials during `cds import --from process`

## Version 0.1.0 - 2026-03-27

### Added

- Initial release
