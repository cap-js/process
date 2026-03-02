import { PROCESS_START, PROCESS_START_ID, PROCESS_START_INPUTS } from '../../../lib/constants';
import { validateModel, withProcessDefinition, wrapEntity } from './helpers';

// Tests additional annotation validation specific for start annotation

describe(`Build Validation: @bpm.process.start annotations`, () => {
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

  describe(`${PROCESS_START_INPUTS} tests`, () => {
    it('should pass with all entity fields when no inputs array is specified', async () => {
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

    it('should pass with selected inputs using inputs array', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcess',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        $self.name
                    ]
                }
                entity StartEntity {
                    key ID   : String;
                        name : String;
                        age  : Integer;
                }
            `;
      const processInputs = `ID: String; name: String; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        'validProcess',
        processInputs,
      );

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should pass with aliased inputs', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcess',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        { path: $self.name, as: 'userName' }
                    ]
                }
                entity StartEntity {
                    key ID   : String;
                        name : String;
                }
            `;
      const processInputs = `ID: String; userName: String; businesskey: String;`;

      const cdsSourceProcessDef = withProcessDefinition(
        entityDef,
        'validProcess',
        processInputs,
      );

      const result = await validateModel(cdsSourceProcessDef);

      expect(result.errors).toHaveLength(0);
      expect(result.buildSucceeded).toBe(true);
    });

    it('should pass with nested composition in inputs array', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcess',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        $self.items
                    ]
                }
                entity StartEntity {
                    key ID    : String;
                        items : Composition of many ItemEntity on items.parentID = $self.ID;
                }

                entity ItemEntity {
                    key ID       : String;
                        parentID : String;
                        title    : String;
                        price    : Decimal(15,2);
                }
            `;
      const processInputs = `ID: String; items: ItemType; businesskey: String;`;
      const otherTypes = 'type ItemType { ID: String; parentID: String; title: String; price: Decimal(15,2); }';

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

    it('should pass with selected nested composition fields', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcess',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        $self.items.ID,
                        $self.items.title
                    ]
                }
                entity StartEntity {
                    key ID    : String;
                        items : Composition of many ItemEntity on items.parent = $self;
                }

                entity ItemEntity {
                    key ID     : String;
                        parent : Association to StartEntity;
                        title  : String;
                        price  : Decimal(15,2);
                }
            `;
      const processInputs = `ID: String; items: ItemType; businesskey: String;`;
      const otherTypes = 'type ItemType { ID: String; title: String; }';

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

    it('should ERROR when entity input is not in process definition', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        $self.name
                    ]
                }
                entity FirstEntity {
                    key ID   : String;
                        name : String;
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

    it('should ERROR when mandatory process input is missing from entity', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE',
                    inputs: [
                        $self.ID
                    ]
                }
                entity FirstEntity {
                    key ID : String;
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

    it('should WARN if mandatory process input is not mandatory in entity', async () => {
      const entityDef = `
                ${PROCESS_START}: {
                    id: 'validProcessID',
                    on: 'CREATE',
                    inputs: [
                        $self.ID,
                        $self.mandatoryField
                    ]
                }
                entity FirstEntity {
                    key ID             : String;
                        mandatoryField : String;
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
