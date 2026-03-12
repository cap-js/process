/* eslint-disable @typescript-eslint/no-explicit-any */
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
        expect(definitions[serviceName]['@bpm.process']).toBe('test.project.simpleProcess');
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

      it('should generate ProcessInstance type with correct elements', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const instanceType = definitions[
          'test.project.SimpleProcessService.ProcessInstance'
        ] as any;

        expect(instanceType).toBeDefined();
        expect(instanceType.kind).toBe('type');
        expect(instanceType.elements.id).toBeDefined();
        expect(instanceType.elements.id.type).toBe('cds.String');
        expect(instanceType.elements.status).toBeDefined();
        expect(instanceType.elements.status.type).toBe('cds.String');
        expect(instanceType.elements.definitionId).toBeDefined();
        expect(instanceType.elements.definitionId.type).toBe('cds.String');
        expect(instanceType.elements.definitionVersion).toBeDefined();
        expect(instanceType.elements.definitionVersion.type).toBe('cds.String');
        expect(instanceType.elements.startedAt).toBeDefined();
        expect(instanceType.elements.startedAt.type).toBe('cds.String');
        expect(instanceType.elements.startedBy).toBeDefined();
        expect(instanceType.elements.startedBy.type).toBe('cds.String');
      });

      it('should generate ProcessInstances type with correct element', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';
        const instancesType = definitions[`${serviceName}.ProcessInstances`] as any;

        expect(instancesType).toBeDefined();
        expect(instancesType.items).toBeDefined();
        expect(instancesType.items.type).toBe(`${serviceName}.ProcessInstance`);
      });

      it('should generate ProcessAttribute type with correct elements', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';
        const attributeType = definitions[`${serviceName}.ProcessAttribute`] as any;

        expect(attributeType).toBeDefined();
        expect(attributeType.elements.id).toBeDefined();
        expect(attributeType.elements.id.type).toBe('cds.String');
        expect(attributeType.elements.label).toBeDefined();
        expect(attributeType.elements.label.type).toBe('cds.String');
        expect(attributeType.elements.value).toBeDefined();
        expect(attributeType.elements.value.type).toBe('cds.String');
        expect(attributeType.elements.type).toBeDefined();
        expect(attributeType.elements.type.type).toBe('cds.String');
      });

      it('should generate ProcessAttributes type with correct element', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';
        const attributesType = definitions[`${serviceName}.ProcessAttributes`] as any;

        expect(attributesType).toBeDefined();
        expect(attributesType.items).toBeDefined();
        expect(attributesType.items.type).toBe(`${serviceName}.ProcessAttribute`);
      });

      it('should generate all required actions', async () => {
        const csn = await importProcess(simpleProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.project.SimpleProcessService';

        const startAction = definitions[`${serviceName}.start`] as any;
        expect(startAction).toBeDefined();
        expect(startAction.kind).toBe('action');
        expect(startAction.params.inputs).toBeDefined();
        expect(startAction.params.inputs.type).toBe(`${serviceName}.ProcessInputs`);
        expect(startAction.params.inputs.notNull).toBe(true);
        expect(startAction.returns).toBeUndefined();
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

        const getInstancesByBusinessKey = definitions[
          `${serviceName}.getInstancesByBusinessKey`
        ] as any;
        expect(getInstancesByBusinessKey).toBeDefined();
        expect(getInstancesByBusinessKey.kind).toBe('function');
        expect(getInstancesByBusinessKey.returns.type).toBe(`${serviceName}.ProcessInstances`);
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
    });

    describe('Process with No Inputs', () => {
      it('should generate CSN model for process without inputs section', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';

        expect(definitions[serviceName]).toBeDefined();
        expect(definitions[serviceName].kind).toBe('service');
        expect(definitions[serviceName]['@bpm.process']).toBe('test.scheduled.noInputsProcess');
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

      it('should generate start action with no inputs parameter when process has no inputs', async () => {
        const csn = await importProcess(noInputsProcessPath);
        const definitions = getDefinitions(csn);
        const serviceName = 'test.scheduled.NoInputsProcessService';
        const startAction = definitions[`${serviceName}.start`] as any;

        expect(startAction).toBeDefined();
        expect(startAction.kind).toBe('action');
        expect(startAction.params).toBeUndefined();
        expect(startAction.returns).toBeUndefined();
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
        expect(getAttributes.returns.type).toBe(`${serviceName}.ProcessAttributes`);

        const getOutputs = definitions[`${serviceName}.getOutputs`] as any;
        expect(getOutputs).toBeDefined();
        expect(getOutputs.kind).toBe('function');
        expect(getOutputs.returns.type).toBe(`${serviceName}.ProcessOutputs`);

        const getInstancesByBusinessKey = definitions[
          `${serviceName}.getInstancesByBusinessKey`
        ] as any;
        expect(getInstancesByBusinessKey).toBeDefined();
        expect(getInstancesByBusinessKey.kind).toBe('function');
        expect(getInstancesByBusinessKey.returns.type).toBe(`${serviceName}.ProcessInstances`);
      });
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

      // Start action should have no params when inputs type is empty
      const startAction = definitions[`${serviceName}.start`] as any;
      expect(startAction.params).toBeUndefined();
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

      // All inputs are optional (required: []) — inputs param should exist but not be notNull
      const startAction = definitions[`${serviceName}.start`] as any;
      expect(startAction.params.inputs).toBeDefined();
      expect(startAction.params.inputs.type).toBe(`${serviceName}.ProcessInputs`);
      expect(startAction.params.inputs.notNull).toBeUndefined();
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

  describe('Start Action Input Tiers', () => {
    it('Tier 1: should generate start action with no params when process has no input properties', async () => {
      const process = {
        uid: 'tier1',
        name: 'Tier 1 Process',
        type: 'bpi.process',
        header: {
          outputs: { type: 'object', properties: {}, required: [] },
          processAttributes: { type: 'object', properties: {}, required: [] },
        },
        identifier: 'tier1Process',
        projectId: 'test.tiers',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'tier1.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(process, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const serviceName = 'test.tiers.Tier1ProcessService';
      const startAction = definitions[`${serviceName}.start`] as any;

      expect(startAction).toBeDefined();
      expect(startAction.kind).toBe('action');
      expect(startAction.params).toBeUndefined();
    });

    it('Tier 2: should generate start action with optional inputs param when all input fields are optional', async () => {
      const process = {
        uid: 'tier2',
        name: 'Tier 2 Process',
        type: 'bpi.process',
        header: {
          inputs: {
            type: 'object',
            properties: {
              comment: { type: 'string' },
              priority: { type: 'integer' },
            },
            required: [],
          },
          outputs: { type: 'object', properties: {}, required: [] },
          processAttributes: { type: 'object', properties: {}, required: [] },
        },
        identifier: 'tier2Process',
        projectId: 'test.tiers',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'tier2.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(process, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const serviceName = 'test.tiers.Tier2ProcessService';
      const startAction = definitions[`${serviceName}.start`] as any;

      expect(startAction).toBeDefined();
      expect(startAction.kind).toBe('action');
      expect(startAction.params).toBeDefined();
      expect(startAction.params.inputs).toBeDefined();
      expect(startAction.params.inputs.type).toBe(`${serviceName}.ProcessInputs`);
      expect(startAction.params.inputs.notNull).toBeUndefined();
    });

    it('Tier 3: should generate start action with required inputs param when some inputs are required', async () => {
      const process = {
        uid: 'tier3',
        name: 'Tier 3 Process',
        type: 'bpi.process',
        header: {
          inputs: {
            type: 'object',
            properties: {
              orderId: { type: 'string' },
              comment: { type: 'string' },
            },
            required: ['orderId'],
          },
          outputs: { type: 'object', properties: {}, required: [] },
          processAttributes: { type: 'object', properties: {}, required: [] },
        },
        identifier: 'tier3Process',
        projectId: 'test.tiers',
      };

      const targetPath = path.join(tempDir, 'srv', 'external', 'tier3.json');
      await fs.promises.writeFile(targetPath, JSON.stringify(process, null, 2));

      const csn = await importProcess(targetPath);
      const definitions = getDefinitions(csn);
      const serviceName = 'test.tiers.Tier3ProcessService';
      const startAction = definitions[`${serviceName}.start`] as any;

      expect(startAction).toBeDefined();
      expect(startAction.kind).toBe('action');
      expect(startAction.params).toBeDefined();
      expect(startAction.params.inputs).toBeDefined();
      expect(startAction.params.inputs.type).toBe(`${serviceName}.ProcessInputs`);
      expect(startAction.params.inputs.notNull).toBe(true);
    });
  });
});
