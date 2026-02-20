import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import cds from '@sap/cds';
import { importProcess } from '../../../lib/processImport';

function getDefinitions(csn: any): Record<string, any> {
  expect(csn.definitions).toBeDefined();
  return csn.definitions!;
}

/**
 * Integration tests for process-import functionality.
 * Tests local JSON import (cloud import cannot be tested without credentials).
 *
 * These tests use a temporary directory to avoid modifying real project files.
 */
describe('Process Import Integration Tests', () => {
  let tempDir: string;
  let originalCdsRoot: string;

  const fixturesDir = path.join(__dirname, 'fixtures');
  const simpleProcessPath = path.join(fixturesDir, 'simple-process.json');
  const complexProcessPath = path.join(fixturesDir, 'complex-process.json');
  const noInputsProcessPath = path.join(fixturesDir, 'no-inputs-process.json');

  beforeAll(() => {
    originalCdsRoot = cds.root;
  });

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'process-import-test-'));

    await fs.promises.mkdir(path.join(tempDir, 'srv', 'external'), { recursive: true });

    const packageJson = {
      name: 'test-project',
      version: '1.0.0',
    };
    await fs.promises.writeFile(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2),
    );

    (cds as any).root = tempDir;
  });

  afterEach(async () => {
    (cds as any).root = originalCdsRoot;

    if (tempDir) {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('CSN Model Generation', () => {
    describe('Simple Process', () => {
      it('should generate a valid CSN model from simple process JSON', async () => {
        const csn = await importProcess(simpleProcessPath);

        expect(csn).toBeDefined();
        expect(csn.$version).toBe('2.0');
        expect(csn.definitions).toBeDefined();
      });

      it('should create service definition with correct name', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';

        expect(definitions[serviceName]).toBeDefined();
        expect(definitions[serviceName].kind).toBe('service');
        expect(definitions[serviceName]['@protocol']).toBe('none');
        expect(definitions[serviceName]['@build.process']).toBe('test.project.simpleProcess');
      });

      it('should generate ProcessInputs type with correct elements', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const inputsType = definitions['test.project.SimpleProcessService.ProcessInputs'] as any;

        expect(inputsType).toBeDefined();
        expect(inputsType.kind).toBe('type');
        expect(inputsType.elements).toBeDefined();

        expect(inputsType.elements.orderId).toBeDefined();
        expect(inputsType.elements.orderId.type).toBe('cds.String');
        expect(inputsType.elements.orderId.notNull).toBe(true);
        expect(inputsType.elements.amount).toBeDefined();
        expect(inputsType.elements.amount.type).toBe('cds.DecimalFloat');
        expect(inputsType.elements.isUrgent).toBeDefined();
        expect(inputsType.elements.isUrgent.type).toBe('cds.Boolean');
      });

      it('should generate ProcessOutputs type', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const outputsType = definitions['test.project.SimpleProcessService.ProcessOutputs'] as any;

        expect(outputsType).toBeDefined();
        expect(outputsType.kind).toBe('type');
        expect(outputsType.elements.result).toBeDefined();
        expect(outputsType.elements.result.type).toBe('cds.String');
      });

      it('should generate ProcessInstance type', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const instanceType = definitions[
          'test.project.SimpleProcessService.ProcessInstance'
        ] as any;

        expect(instanceType).toBeDefined();
        expect(instanceType.kind).toBe('type');
        expect(instanceType.elements.id).toBeDefined();
        expect(instanceType.elements.definitionId).toBeDefined();
        expect(instanceType.elements.startedAt).toBeDefined();
        expect(instanceType.elements.startedBy).toBeDefined();
      });

      it('should generate all required actions', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';

        const startAction = definitions[`${serviceName}.start`] as any;
        expect(startAction).toBeDefined();
        expect(startAction.kind).toBe('action');
        expect(startAction.params.inputs).toBeDefined();
        expect(startAction.returns.type).toBe(`${serviceName}.ProcessInstance`);
        for (const action of ['suspend', 'resume', 'cancel']) {
          const lifecycleAction = definitions[`${serviceName}.${action}`] as any;
          expect(lifecycleAction).toBeDefined();
          expect(lifecycleAction.kind).toBe('action');
          expect(lifecycleAction.params.businessKey).toBeDefined();
          expect(lifecycleAction.params.cascade).toBeDefined();
        }
      });

      it('should generate query functions', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';

        const getAttributes = definitions[`${serviceName}.getAttributes`] as any;
        expect(getAttributes).toBeDefined();
        expect(getAttributes.kind).toBe('function');
        expect(getAttributes.params.processInstanceId).toBeDefined();
        expect(getAttributes.returns.type).toBe(`${serviceName}.ProcessAttributes`);

        const getOutputs = definitions[`${serviceName}.getOutputs`] as any;
        expect(getOutputs).toBeDefined();
        expect(getOutputs.kind).toBe('function');
        expect(getOutputs.returns.type).toBe(`${serviceName}.ProcessOutputs`);
      });
    });

    describe('Complex Process with Data Types', () => {
      it('should generate CSN model with nested data types', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';

        expect(definitions[serviceName]).toBeDefined();
        expect(definitions[`${serviceName}.Customer`]).toBeDefined();
        expect(definitions[`${serviceName}.Address`]).toBeDefined();
        expect(definitions[`${serviceName}.OrderConfirmation`]).toBeDefined();
      });

      it('should resolve type references correctly', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';
        const inputsType = definitions[`${serviceName}.ProcessInputs`] as any;

        expect(inputsType.elements.customer).toBeDefined();
        expect(inputsType.elements.customer.type).toBe(`${serviceName}.Customer`);
        expect(inputsType.elements.customer.notNull).toBe(true);
        expect(inputsType.elements.businesskey).toBeDefined();
        expect(inputsType.elements.businesskey.type).toBe('cds.String');
      });

      it('should map date format references to CDS types', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';
        const inputsType = definitions[`${serviceName}.ProcessInputs`] as any;

        expect(inputsType.elements.orderDate).toBeDefined();
        expect(inputsType.elements.orderDate.type).toBe('cds.Date');
      });

      it('should generate nested types for data types with references', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';

        const customerType = definitions[`${serviceName}.Customer`] as any;
        expect(customerType).toBeDefined();
        expect(customerType.elements.customerId).toBeDefined();
        expect(customerType.elements.name).toBeDefined();
        expect(customerType.elements.address).toBeDefined();
        expect(customerType.elements.address.type).toBe(`${serviceName}.Address`);
      });

      it('should handle array types with inline object items', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';

        const confirmationType = definitions[`${serviceName}.OrderConfirmation`] as any;
        expect(confirmationType).toBeDefined();
        expect(confirmationType.elements.items).toBeDefined();
        const itemsArrayType = definitions[`${serviceName}.OrderConfirmation_items_Array`] as any;
        expect(itemsArrayType).toBeDefined();
        expect(itemsArrayType.items).toBeDefined();
        expect(itemsArrayType.items.elements).toBeDefined();
        expect(itemsArrayType.items.elements.itemId).toBeDefined();
        expect(itemsArrayType.items.elements.quantity).toBeDefined();
        expect(itemsArrayType.items.elements.price).toBeDefined();
      });

      it('should generate ProcessAttributes type', async () => {
        const csn = await importProcess(complexProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.company.orders.ComplexProcessService';
        const attributesType = definitions[`${serviceName}.ProcessAttributes`] as any;

        expect(attributesType).toBeDefined();
        expect(attributesType.elements.processedBy).toBeDefined();
        expect(attributesType.elements.processedBy.type).toBe('cds.String');
      });
    });

    describe('Process with No Inputs', () => {
      it('should generate CSN model for process without inputs section', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';

        expect(definitions[serviceName]).toBeDefined();
        expect(definitions[serviceName].kind).toBe('service');
        expect(definitions[serviceName]['@build.process']).toBe('test.scheduled.noInputsProcess');
      });

      it('should create empty ProcessInputs type when inputs section is missing', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';
        const inputsType = definitions[`${serviceName}.ProcessInputs`] as any;

        expect(inputsType).toBeDefined();
        expect(inputsType.kind).toBe('type');
        expect(inputsType.elements).toEqual({});
      });

      it('should still generate ProcessOutputs type with defined outputs', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';
        const outputsType = definitions[`${serviceName}.ProcessOutputs`] as any;

        expect(outputsType).toBeDefined();
        expect(outputsType.kind).toBe('type');
        expect(outputsType.elements.status).toBeDefined();
        expect(outputsType.elements.status.type).toBe('cds.String');
        expect(outputsType.elements.processedCount).toBeDefined();
        expect(outputsType.elements.processedCount.type).toBe('cds.Integer');
      });

      it('should generate ProcessAttributes type', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';
        const attributesType = definitions[`${serviceName}.ProcessAttributes`] as any;

        expect(attributesType).toBeDefined();
        expect(attributesType.elements.lastRunTime).toBeDefined();
        expect(attributesType.elements.lastRunTime.type).toBe('cds.String');
      });

      it('should generate start action with empty inputs parameter', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';
        const startAction = definitions[`${serviceName}.start`] as any;

        expect(startAction).toBeDefined();
        expect(startAction.kind).toBe('action');
        expect(startAction.params.inputs).toBeDefined();
        expect(startAction.params.inputs.type).toBe(`${serviceName}.ProcessInputs`);
        expect(startAction.returns.type).toBe(`${serviceName}.ProcessInstance`);
      });

      it('should generate all lifecycle actions', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';

        for (const action of ['suspend', 'resume', 'cancel']) {
          const lifecycleAction = definitions[`${serviceName}.${action}`] as any;
          expect(lifecycleAction).toBeDefined();
          expect(lifecycleAction.kind).toBe('action');
        }
      });

      it('should generate query functions', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';

        const getAttributes = definitions[`${serviceName}.getAttributes`] as any;
        expect(getAttributes).toBeDefined();
        expect(getAttributes.kind).toBe('function');

        const getOutputs = definitions[`${serviceName}.getOutputs`] as any;
        expect(getOutputs).toBeDefined();
        expect(getOutputs.kind).toBe('function');
      });
    });
  });

  describe('Package.json Update', () => {
    it('should add service to package.json with kind external', async () => {
      const targetPath = path.join(tempDir, 'srv', 'external', 'test.project.simpleProcess.json');
      await fs.promises.copyFile(simpleProcessPath, targetPath);

      await importProcess(targetPath);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));

      expect(packageJson.cds).toBeDefined();
      expect(packageJson.cds.requires).toBeDefined();
      expect(packageJson.cds.requires['test.project.SimpleProcessService']).toBeDefined();
      expect(packageJson.cds.requires['test.project.SimpleProcessService'].kind).toBe('external');
      expect(packageJson.cds.requires['test.project.SimpleProcessService'].model).toBe(
        'srv/external/test.project.simpleProcess',
      );
    });

    it('should compute correct model path from absolute file path', async () => {
      const targetPath = path.join(tempDir, 'srv', 'external', 'my.custom.path.json');
      await fs.promises.copyFile(simpleProcessPath, targetPath);

      await importProcess(targetPath);

      const packageJsonPath = path.join(tempDir, 'package.json');
      const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));

      expect(packageJson.cds.requires['test.project.SimpleProcessService'].model).toBe(
        'srv/external/my.custom.path',
      );
    });

    it('should preserve existing package.json content', async () => {
      const existingPackageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: { '@sap/cds': '^7.0.0' },
        cds: {
          requires: {
            ExistingService: { kind: 'external', model: 'srv/existing' },
          },
        },
      };
      await fs.promises.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(existingPackageJson, null, 2),
      );

      const targetPath = path.join(tempDir, 'srv', 'external', 'test.json');
      await fs.promises.copyFile(simpleProcessPath, targetPath);

      await importProcess(targetPath);

      const packageJson = JSON.parse(
        await fs.promises.readFile(path.join(tempDir, 'package.json'), 'utf8'),
      );

      expect(packageJson.name).toBe('test-project');
      expect(packageJson.dependencies['@sap/cds']).toBe('^7.0.0');
      expect(packageJson.cds.requires['ExistingService']).toBeDefined();
      expect(packageJson.cds.requires['test.project.SimpleProcessService']).toBeDefined();
    });

    it('should create cds.requires if not present', async () => {
      const packageJson = { name: 'test-project', version: '1.0.0' };
      await fs.promises.writeFile(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2),
      );

      const targetPath = path.join(tempDir, 'srv', 'external', 'test.json');
      await fs.promises.copyFile(simpleProcessPath, targetPath);

      await importProcess(targetPath);

      const updatedPackageJson = JSON.parse(
        await fs.promises.readFile(path.join(tempDir, 'package.json'), 'utf8'),
      );

      expect(updatedPackageJson.cds).toBeDefined();
      expect(updatedPackageJson.cds.requires).toBeDefined();
      expect(updatedPackageJson.cds.requires['test.project.SimpleProcessService']).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle process with empty inputs', async () => {
      const emptyInputsProcess = {
        uid: 'empty-inputs',
        name: 'Empty Inputs Process',
        type: 'bpi.process',
        header: {
          inputs: { type: 'object', properties: {}, required: [] },
          outputs: { type: 'object', properties: {}, required: [] },
          processAttributes: { type: 'object', properties: {}, required: [] },
        },
        identifier: 'emptyProcess',
        projectId: 'test.empty',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'empty.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(emptyInputsProcess, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const serviceName = 'test.empty.EmptyProcessService';

      expect(definitions[serviceName]).toBeDefined();
      expect(definitions[`${serviceName}.ProcessInputs`]).toBeDefined();
      expect((definitions[`${serviceName}.ProcessInputs`] as any).elements).toEqual({});
    });

    it('should handle process with missing optional header sections', async () => {
      const minimalProcess = {
        uid: 'minimal',
        name: 'Minimal Process',
        type: 'bpi.process',
        header: {
          inputs: { type: 'object', properties: { id: { type: 'string' } }, required: [] },
        },
        identifier: 'minimalProcess',
        projectId: 'test.minimal',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'minimal.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(minimalProcess, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const serviceName = 'test.minimal.MinimalProcessService';

      expect(definitions[serviceName]).toBeDefined();
      expect(definitions[`${serviceName}.ProcessOutputs`]).toBeDefined();
      expect(definitions[`${serviceName}.ProcessAttributes`]).toBeDefined();
    });

    it('should sanitize invalid identifier characters in type names', async () => {
      const processWithSpecialChars = {
        uid: 'special-chars',
        name: 'Special-Chars Process',
        type: 'bpi.process',
        header: {
          inputs: {
            type: 'object',
            properties: {
              'my-field': { type: 'string' },
              '123startsWithNumber': { type: 'string' },
              'field.with.dots': { type: 'string' },
            },
            required: [],
          },
          outputs: { type: 'object', properties: {}, required: [] },
          processAttributes: { type: 'object', properties: {}, required: [] },
        },
        identifier: 'specialProcess',
        projectId: 'test.special',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'special.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(processWithSpecialChars, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const inputsType = definitions['test.special.SpecialProcessService.ProcessInputs'] as any;

      expect(inputsType.elements.my_field).toBeDefined();
      expect(inputsType.elements._123startsWithNumber).toBeDefined();
      expect(inputsType.elements.field_with_dots).toBeDefined();
    });
  });
});
