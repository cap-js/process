import { PROCESS_INPUT, PROCESS_START, PROCESS_START_ID } from '../../../lib/constants';
import { validateModel, withProcessDefinition, wrapEntity } from './helpers';

// Tests additional annotation validation specific for start annotation

describe(`Build Validation: @build.process.start annotations`, () => {
  describe('Required annotations', () => {
    it('should PASS when both ID and on are present', async () => {
      const cdsSource = wrapEntity(`
                ${PROCESS_START}: { id: 'someProcess', on: 'DELETE' }
                entity ValidEntity { key ID: UUID; }
            `);

      const result = await validateModel(cdsSource);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should ERROR when ID is present but on is missing', async () => {
      const cdsSource = wrapEntity(`
                ${PROCESS_START}: { id: 'someProcess' }
                entity InvalidEntity { key ID: UUID; }
            `);

      const result = await validateModel(cdsSource);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) =>
            e.msg.includes(`${PROCESS_START}.id`) &&
            e.msg.includes('requires') &&
            e.msg.includes(`${PROCESS_START}.on`),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should ERROR when ON is present but ID is missing', async () => {
      const cdsSource = wrapEntity(`
                ${PROCESS_START}: { on: 'DELETE' }
                entity InvalidEntity { key ID: UUID; }
            `);

      const result = await validateModel(cdsSource);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) =>
            e.msg.includes(`${PROCESS_START}.on`) &&
            e.msg.includes('requires') &&
            e.msg.includes(`${PROCESS_START}.id`),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should NOT throw errors for entities without start annotations', async () => {
      const cdsSource = wrapEntity(`
                entity NoAnnotations { key ID: UUID; name: String; }
            `);

      const result = await validateModel(cdsSource);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });
  });

  describe(`${PROCESS_START_ID} tests`, () => {
    it('should pass when ID is valid', async () => {
      const entityDef = `
                ${PROCESS_START}: { id: 'validProcessId', on: 'DELETE' }
                entity ValidEntity { key ID: String; }
            `;
      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        'validProcessId',
        'ID: String; businesskey: String;',
      );

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });
    it('should ERROR when ID is not a string', async () => {
      const cdsSource = wrapEntity(`
                ${PROCESS_START}: { id: 123, on: 'DELETE' }
                entity InvalidEntity { key ID: UUID; }
            `);

      const result = await validateModel(cdsSource);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) => e.msg.includes(`${PROCESS_START}.id`) && e.msg.includes('string'),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should WARN if ID is not an imported process', async () => {
      const entityDef = wrapEntity(`
                ${PROCESS_START}: { id: 'invalidProcessId', on: 'DELETE' }
                entity ValidEntity { key ID: String; }
            `);

      const result = await validateModel(entityDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
      expect(result.warnings.some((w) => w.msg.includes('invalidProcessId'))).toBe(true);
      expect(result.buildSucceeded).toBe(true);
    });
  });

  describe(`${PROCESS_INPUT} tests`, () => {
    it('should pass with simple input without any annotation', async () => {
      const entityDef = `
                ${PROCESS_START}: { id: 'validProcessId', on: 'DELETE' }
                entity ValidEntity { key ID: String;
                name: String;
                num: Integer;}
            `;
      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        'validProcessId',
        'ID: String; name: String; num: Integer; businesskey: String;',
      );

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should pass with inputs annotated and nested association', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcess',
                    on: 'CREATE',
                }
                entity startEntity {
                    key ID               : String ${PROCESS_INPUT}: 'identifier';
                        startingShipment : Association to one Shipments
                                            on startingShipment.ID = ID
                                        ${PROCESS_INPUT};
                }

                entity Shipments {
                    key ID      : String  ${PROCESS_INPUT}: 'identifier';
                        address : String ${PROCESS_INPUT};
                        date    : String;
                        weight  : Integer ${PROCESS_INPUT};
                }
            `;
      const processInputs = `identifier: String; startingShipment: Shipments; businesskey: String;`;

      const otherTypes = 'type Shipments { identifier: String; address: String; weight: Integer; }';

      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        'validProcess',
        processInputs,
        otherTypes,
      );

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should ERROR when cycle in input annotation is found', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE'
                }
                entity FirstEntity {
                    key ID             : String ${PROCESS_INPUT};
                        secondEntityID : String ${PROCESS_INPUT};
                        secondEntity   : Composition of many SecondEntity
                                        on secondEntityID = secondEntity.ID
                                        ${PROCESS_INPUT};
                }

                entity SecondEntity {
                    key ID            : String ${PROCESS_INPUT};
                        firstEntityID : String ${PROCESS_INPUT};
                        firstEntity   : Composition of many FirstEntity
                                        on firstEntityID = firstEntity.ID
                                        ${PROCESS_INPUT};
                }
            `;
      const processInputs = `ID: String; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(entityDef, 'validProcessID', processInputs);

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.msg.includes('Cycle detected'))).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should ERROR when entity input is not in process input', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE'
                }
                entity FirstEntity {
                    key ID             : String ${PROCESS_INPUT};
                        name           : String ${PROCESS_INPUT};
                }
            `;
      const processInputs = `ID: String; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(entityDef, 'validProcessID', processInputs);

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) =>
            e.msg.includes('Entity attribute') &&
            e.msg.includes('is not defined in process definition'),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should ERROR when process input is not in entity attributes', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE'
                }
                entity FirstEntity {
                    key ID             : String ${PROCESS_INPUT};
                }
            `;
      const processInputs = `ID: String; name: String not null; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(entityDef, 'validProcessID', processInputs);

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) => e.msg.includes('Mandatory input') && e.msg.includes('is missing'),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });

    it('should WARN if mandatory process input is not mandatory in entity attribute', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE'
                }
                entity FirstEntity {
                    key ID             : String ${PROCESS_INPUT};
                    mandatoryField: String ${PROCESS_INPUT};
                }
            `;
      const processInputs = `ID: String; mandatoryField: String not null; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(entityDef, 'validProcessID', processInputs);

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
      expect(
        result.warnings.some(
          (w) =>
            w.msg.includes('mandatoryField') &&
            w.msg.includes('is mandatory in process definition') &&
            w.msg.includes('but not marked as @mandatory in the entity'),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should ERROR when business key is missing in process definition inputs', async () => {
      const processId = 'validProcessId';
      const entityDef = `
                ${PROCESS_START}: { id: '${processId}', on: 'DELETE' }
                entity ValidEntity { key ID: String;
                name: String;
                num: Integer;}
            `;
      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        processId,
        'ID: String; name: String; num: Integer;',
      );

      const result = await validateModel(cdsSourceProcessDef);

      // "TestService.ValidEntity: Process definition 'validProcessId' requires a 'businesskey' input but it is not provided"
      expect(result.errors.length).toBeGreaterThan(0);
      expect(
        result.errors.some(
          (e) =>
            e.msg.includes('Process definition') &&
            e.msg.includes(processId) &&
            e.msg.includes(`requires a 'businesskey' input`),
        ),
      ).toBe(true);
      expect(result.buildSucceeded).toBe(false);
    });
  });
});
