import { PROCESS_START } from '../../../lib/constants';
import { validateModel, wrapEntity } from './helpers';

// =============================================================================
// Qualified Start Annotations
// =============================================================================
describe('Build Validation: Qualified @bpm.process.start annotations', () => {
  it('should PASS with a single qualified start annotation', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #one: { id: 'process1', on: 'CREATE' }
      entity SingleQualifiedStart { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors).toHaveLength(0);
    expect(result.buildSucceeded).toBe(true);
  });

  it('should PASS with multiple qualified start annotations on the same entity', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #one: { id: 'process1', on: 'CREATE' }
      @bpm.process.start #two: { id: 'process2', on: 'UPDATE' }
      entity MultiQualifiedStart { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors).toHaveLength(0);
    expect(result.buildSucceeded).toBe(true);
  });

  it('should PASS with mixed unqualified and qualified start annotations', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start: { id: 'processA', on: 'CREATE' }
      @bpm.process.start #alt: { id: 'processB', on: 'UPDATE' }
      entity MixedStart { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors).toHaveLength(0);
    expect(result.buildSucceeded).toBe(true);
  });

  it('should ERROR when qualified start has id but no on', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #bad: { id: 'process1' }
      entity BadQualifiedStart { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) =>
          e.msg.includes(`${PROCESS_START}#bad.id`) &&
          e.msg.includes('requires') &&
          e.msg.includes(`${PROCESS_START}#bad.on`),
      ),
    ).toBe(true);
    expect(result.buildSucceeded).toBe(false);
  });

  it('should ERROR when qualified start has on but no id', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #bad: { on: 'DELETE' }
      entity BadQualifiedStart2 { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(
      result.errors.some(
        (e) =>
          e.msg.includes(`${PROCESS_START}#bad.on`) &&
          e.msg.includes('requires') &&
          e.msg.includes(`${PROCESS_START}#bad.id`),
      ),
    ).toBe(true);
    expect(result.buildSucceeded).toBe(false);
  });

  it('should validate each qualified start independently — one valid, one invalid', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #good: { id: 'process1', on: 'CREATE' }
      @bpm.process.start #bad: { id: 'process2' }
      entity MixedValidity { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(result.errors.length).toBeGreaterThan(0);
    // Only the #bad qualifier should produce an error
    expect(result.errors.some((e) => e.msg.includes('#bad'))).toBe(true);
    expect(result.errors.some((e) => e.msg.includes('#good'))).toBe(false);
    expect(result.buildSucceeded).toBe(false);
  });

  it('should WARN for unknown sub-annotation on qualified start', async () => {
    const cdsSource = wrapEntity(`
      @bpm.process.start #q1: { id: 'process1', on: 'CREATE' }
      @bpm.process.start#q1.unknown: 'bad'
      entity UnknownQualified { key ID: UUID; }
    `);

    const result = await validateModel(cdsSource);

    expect(
      result.warnings.some((w) => w.msg.includes('unknown') || w.msg.includes('Unknown')),
    ).toBe(true);
    expect(result.buildSucceeded).toBe(true);
  });
});
