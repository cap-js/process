import {
  PROCESS_CANCEL,
  PROCESS_RESUME,
  PROCESS_START,
  PROCESS_SUSPEND,
} from '../../../lib/constants';
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

// =============================================================================
// Qualified Lifecycle Annotations (cancel, suspend, resume)
// =============================================================================
describe('Build Validation: Qualified lifecycle annotations', () => {
  const lifecycleAnnotations = [
    { annotationBase: PROCESS_CANCEL, label: 'cancel' },
    { annotationBase: PROCESS_SUSPEND, label: 'suspend' },
    { annotationBase: PROCESS_RESUME, label: 'resume' },
  ];

  describe.each(lifecycleAnnotations)(
    'Qualified $annotationBase annotations',
    ({ annotationBase, label }) => {
      it('should PASS with a single qualified annotation and unqualified businessKey', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #one: { on: 'DELETE', cascade: true }
          @bpm.process.businessKey: (ID)
          entity SingleQualified${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should PASS with multiple qualified annotations sharing unqualified businessKey', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #one: { on: 'UPDATE' }
          ${annotationBase} #two: { on: 'DELETE', cascade: true }
          @bpm.process.businessKey: (ID)
          entity MultiQualified${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should PASS with qualified annotation using matching qualified businessKey', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #special: { on: 'UPDATE' }
          @bpm.process.businessKey #special: (name)
          entity QualifiedBizKey${label} { key ID: UUID; name: String; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should PASS with qualified annotation falling back to unqualified businessKey', async () => {
        // No #myq qualified businessKey, so falls back to unqualified
        const cdsSource = wrapEntity(`
          ${annotationBase} #myq: { on: 'UPDATE' }
          @bpm.process.businessKey: (ID)
          entity FallbackBizKey${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should PASS with mixed unqualified and qualified annotations', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase}: { on: 'DELETE' }
          ${annotationBase} #alt: { on: 'UPDATE', cascade: true }
          @bpm.process.businessKey: (ID)
          entity Mixed${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should ERROR when qualified annotation has cascade but no on', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #bad: { cascade: true }
          @bpm.process.businessKey: (ID)
          entity MissingOn${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (e) =>
              e.msg.includes(`${annotationBase}#bad`) &&
              e.msg.includes('requires') &&
              e.msg.includes('.on'),
          ),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should ERROR when qualified annotation is present but no businessKey at all', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #nobk: { on: 'UPDATE' }
          entity NoBizKey${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (e) => e.msg.includes('business key') && e.msg.includes(`${annotationBase}#nobk`),
          ),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should validate each qualified annotation independently — one valid, one invalid', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #good: { on: 'DELETE' }
          ${annotationBase} #bad: { cascade: true }
          @bpm.process.businessKey: (ID)
          entity MixedValid${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        // Only #bad should have errors (missing .on)
        expect(result.errors.some((e) => e.msg.includes('#bad'))).toBe(true);
        expect(result.errors.some((e) => e.msg.includes('#good'))).toBe(false);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should WARN for unknown sub-annotation on qualified lifecycle annotation', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #q1: { on: 'DELETE' }
          ${annotationBase}#q1.unknown: 'bad'
          @bpm.process.businessKey: (ID)
          entity UnknownSub${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(
          result.warnings.some((w) => w.msg.includes('unknown') || w.msg.includes('Unknown')),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should validate .on value on qualified annotation', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #inv: { on: 'INVALID_EVENT' }
          @bpm.process.businessKey: (ID)
          entity InvalidOnQualified${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (e) => e.msg.includes('must be either a lifecycle event') || e.msg.includes('action'),
          ),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should validate .cascade type on qualified annotation', async () => {
        const cdsSource = wrapEntity(`
          ${annotationBase} #inv: { on: 'DELETE', cascade: 'true' }
          @bpm.process.businessKey: (ID)
          entity InvalidCascadeQualified${label} { key ID: UUID; }
        `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some((e) => e.msg.includes('cascade') && e.msg.includes('boolean')),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });
    },
  );
});
