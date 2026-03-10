import {
  PROCESS_CANCEL,
  PROCESS_CANCEL_CASCADE,
  PROCESS_CANCEL_IF,
  PROCESS_CANCEL_ON,
  PROCESS_RESUME,
  PROCESS_RESUME_CASCADE,
  PROCESS_RESUME_IF,
  PROCESS_RESUME_ON,
  PROCESS_START,
  PROCESS_START_IF,
  PROCESS_START_ON,
  PROCESS_SUSPEND,
  PROCESS_SUSPEND_CASCADE,
  PROCESS_SUSPEND_IF,
  PROCESS_SUSPEND_ON,
} from '../../../lib/constants';
import { validateModel, wrapEntity } from './helpers';
// Tests required annotations for suspend, cancel, resume
describe('Build Validation: Required Annotations', () => {
  interface AnnotationConfig {
    annotationBase: string;
    annotationOn: string;
    annotationCascade: string;
  }

  const annotationConfigs: AnnotationConfig[] = [
    {
      annotationBase: PROCESS_CANCEL,
      annotationOn: PROCESS_CANCEL_ON,
      annotationCascade: PROCESS_CANCEL_CASCADE,
    },
    {
      annotationBase: PROCESS_SUSPEND,
      annotationOn: PROCESS_SUSPEND_ON,
      annotationCascade: PROCESS_SUSPEND_CASCADE,
    },
    {
      annotationBase: PROCESS_RESUME,
      annotationOn: PROCESS_RESUME_ON,
      annotationCascade: PROCESS_RESUME_CASCADE,
    },
  ];

  describe.each(annotationConfigs)(
    'Build Validation: $annotationBase required annotations',
    ({ annotationBase, annotationOn }) => {
      describe('Required annotations', () => {
        it('should PASS when both on and cascade are present', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { on: 'DELETE', cascade: true }
                        @bpm.process.businessKey: (ID)
                        entity ValidEntity { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS when on is present but cascade is missing (cascade defaults to false)', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { on: 'DELETE' }
                        @bpm.process.businessKey: (ID)
                        entity MissingCascade { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should ERROR when cascade is present but on is missing', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { cascade: true }
                        entity MissingOn { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some(
              (e) =>
                e.msg.includes(annotationBase) &&
                e.msg.includes('requires') &&
                e.msg.includes(annotationOn),
            ),
          ).toBe(true);
          expect(result.buildSucceeded).toBe(false);
        });

        it('should NOT throw errors for entities without annotations', async () => {
          const cdsSource = wrapEntity(`
                        entity NoAnnotations { key ID: UUID; name: String; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });
      });
    },
  );
});

// Tests ON annotation for all process annotations
describe('.on annotation tests ', () => {
  interface AnnotationConfig {
    annotationBase: string;
    annotationOn: string;
    baseProps: string;
    businessKeyAnnotation: string;
  }

  const annotationConfigs: AnnotationConfig[] = [
    {
      annotationBase: PROCESS_START,
      annotationOn: PROCESS_START_ON,
      baseProps: `id: 'someID'`,
      businessKeyAnnotation: '',
    },
    {
      annotationBase: PROCESS_CANCEL,
      annotationOn: PROCESS_CANCEL_ON,
      baseProps: 'cascade: true',
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_SUSPEND,
      annotationOn: PROCESS_SUSPEND_ON,
      baseProps: 'cascade: true',
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_RESUME,
      annotationOn: PROCESS_RESUME_ON,
      baseProps: 'cascade: true',
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
  ];

  describe.each(annotationConfigs)(
    'Build Validation: $annotationOn',
    ({ annotationBase, baseProps, businessKeyAnnotation }) => {
      describe('Valid events', () => {
        it('should PASS with CRUD events', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'CREATE' }
                        ${businessKeyAnnotation}
                        entity OnCreate { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'UPDATE' }
                        ${businessKeyAnnotation}
                        entity OnUpdate { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'DELETE' }
                        ${businessKeyAnnotation}
                        entity OnDelete { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'READ' }
                        ${businessKeyAnnotation}
                        entity OnRead { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS with wildcard (*) event', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: '*' }
                        ${businessKeyAnnotation}
                        entity OnWildcard { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS when on references a valid bound action', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'customAction' }
                        ${businessKeyAnnotation}
                        entity WithAction {
                            key ID: UUID;
                            status: String;
                        } actions {
                            action customAction();
                        }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });
      });

      describe('Invalid event values', () => {
        it('should ERROR when on is not a valid lifecycle event or action', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'INVALID_EVENT' }
                        ${businessKeyAnnotation}
                        entity InvalidEvent { key ID: UUID; }
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

        it('should ERROR when on is lowercase (case sensitive)', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'delete' }
                        ${businessKeyAnnotation}
                        entity LowercaseEvent { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.buildSucceeded).toBe(false);
        });

        it('should ERROR when on is mixed case', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'Delete' }
                        ${businessKeyAnnotation}
                        entity MixedCaseEvent { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.buildSucceeded).toBe(false);
        });

        it('should ERROR when on is empty string', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: '' }
                        ${businessKeyAnnotation}
                        entity EmptyOn { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.buildSucceeded).toBe(false);
        });
      });
    },
  );
});

// Tests cascade annotation for cancel, suspend and resume
describe('.cascade annotation tests', () => {
  // Cascade only allowed for cancel, suspend and resume
  interface AnnotationConfig {
    annotationBase: string;
    annotationCascade: string;
    baseProps: string;
  }

  const annotationConfigs: AnnotationConfig[] = [
    {
      annotationBase: PROCESS_CANCEL,
      annotationCascade: PROCESS_CANCEL_CASCADE,
      baseProps: `on: 'UPDATE'`,
    },
    {
      annotationBase: PROCESS_RESUME,
      annotationCascade: PROCESS_RESUME_CASCADE,
      baseProps: `on: 'UPDATE'`,
    },
    {
      annotationBase: PROCESS_SUSPEND,
      annotationCascade: PROCESS_SUSPEND_CASCADE,
      baseProps: `on: 'UPDATE'`,
    },
  ];

  describe.each(annotationConfigs)(
    'Build validation: $annotationCascade',
    ({ annotationBase, annotationCascade, baseProps }) => {
      describe('Valid cascade values', () => {
        it('should PASS when cascade is true', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: true }
                        @bpm.process.businessKey: (ID)
                        entity CascadeTrue { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS when cascade is false', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: false }
                        @bpm.process.businessKey: (ID)
                        entity CascadeFalse { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });
      });

      describe('Invalid cascade values', () => {
        it('should ERROR when cascade is a string instead of boolean', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: 'true' }
                        @bpm.process.businessKey: (ID)
                        entity CascadeString { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some(
              (e) => e.msg.includes(annotationCascade) && e.msg.includes('boolean'),
            ),
          ).toBe(true);
          expect(result.buildSucceeded).toBe(false);
        });

        it('should ERROR when cascade is a number instead of boolean', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: 1 }
                        @bpm.process.businessKey: (ID)
                        entity CascadeNumber { key ID: UUID; }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some(
              (e) => e.msg.includes(annotationCascade) && e.msg.includes('boolean'),
            ),
          ).toBe(true);
          expect(result.buildSucceeded).toBe(false);
        });
      });
    },
  );
});

// Tests if annotation for all process annotations
describe('.if annotation tests', () => {
  interface AnnotationConfig {
    annotationBase: string;
    annotationIf: string;
    baseProps: string;
    businessKeyAnnotation: string;
  }

  const annotationConfigs: AnnotationConfig[] = [
    {
      annotationBase: PROCESS_START,
      annotationIf: PROCESS_START_IF,
      baseProps: `id: 'someProcess', on: 'UPDATE'`,
      businessKeyAnnotation: '',
    },
    {
      annotationBase: PROCESS_CANCEL,
      annotationIf: PROCESS_CANCEL_IF,
      baseProps: `on: 'UPDATE', cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_RESUME,
      annotationIf: PROCESS_RESUME_IF,
      baseProps: `on: 'UPDATE', cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_SUSPEND,
      annotationIf: PROCESS_SUSPEND_IF,
      baseProps: `on: 'UPDATE', cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
  ];

  describe.each(annotationConfigs)(
    'Build Validation: $annotationIf',
    ({ annotationBase, annotationIf, baseProps, businessKeyAnnotation }) => {
      describe('Valid expressions', () => {
        it('should PASS with simple comparison expression', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: {
                            ${baseProps},
                            if: (status = 'CANCELLED')
                        }
                        ${businessKeyAnnotation}
                        entity SimpleWhen {
                            key ID: UUID;
                            status: String;
                        }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS with complex AND expression', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: {
                            ${baseProps},
                            if: (status = 'CANCELLED' and priority != 'HIGH')
                        }
                        ${businessKeyAnnotation}
                        entity ComplexAndWhen {
                            key ID: UUID;
                            status: String;
                            priority: String;
                        }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });

        it('should PASS with numeric comparison expression', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: {
                            ${baseProps},
                            if: (retryCount >= 3)
                        }
                        ${businessKeyAnnotation}
                        entity NumericWhen {
                            key ID: UUID;
                            retryCount: Integer;
                        }
                    `);

          const result = await validateModel(cdsSource);
          expect(result.errors).toHaveLength(0);
          expect(result.buildSucceeded).toBe(true);
        });
      });

      describe('Invalid expressions', () => {
        it('should ERROR when if is not an expression', async () => {
          const cdsSource = wrapEntity(`
                        ${annotationBase}: {
                            ${baseProps},
                            if: 'not an expression'
                        }
                        ${businessKeyAnnotation}
                        entity InvalidWhen {
                            key ID: UUID;
                            retryCount: Integer;
                        }
                    `);

          const result = await validateModel(cdsSource);

          expect(result.errors.length).toBeGreaterThan(0);
          expect(
            result.errors.some(
              (e) => e.msg.includes(annotationIf) && e.msg.includes('must be a valid expression'),
            ),
          ).toBe(true);
          expect(result.buildSucceeded).toBe(false);
        });
      });
    },
  );
});

// Tests other edge cases for all process annotations
describe('other validation logic tests', () => {
  interface AnnotationConfig {
    annotationBase: string;
    baseProps: string;
    invalidProps: string;
    businessKeyAnnotation: string;
  }

  const annotationConfigs: AnnotationConfig[] = [
    {
      annotationBase: PROCESS_START,
      baseProps: `id: 'someProcess', on: 'DELETE'`,
      invalidProps: `id: 'someProcess'`,
      businessKeyAnnotation: '',
    },
    {
      annotationBase: PROCESS_CANCEL,
      baseProps: `on: 'DELETE', cascade: true`,
      invalidProps: `cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_SUSPEND,
      baseProps: `on: 'DELETE', cascade: true`,
      invalidProps: `cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
    {
      annotationBase: PROCESS_RESUME,
      baseProps: `on: 'DELETE', cascade: true`,
      invalidProps: `cascade: true`,
      businessKeyAnnotation: '@bpm.process.businessKey: (ID)',
    },
  ];

  describe.each(annotationConfigs)(
    'Build Validation: $annotationBase other tests',
    ({ annotationBase, baseProps, invalidProps, businessKeyAnnotation }) => {
      it('should WARN for multiple unknown annotations', async () => {
        const cdsSource = wrapEntity(`
                    ${annotationBase}: { ${baseProps} }
                    ${annotationBase}.foo: 'bar'
                    ${annotationBase}.baz: 123
                    ${businessKeyAnnotation}
                    entity MultipleUnknown { key ID: UUID; }
                `);

        const result = await validateModel(cdsSource);

        // Should have warnings for both unknown annotations
        expect(result.warnings.some((w) => w.msg.includes('foo'))).toBe(true);
        expect(result.warnings.some((w) => w.msg.includes('baz'))).toBe(true);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should validate multiple entities independently', async () => {
        const cdsSource = `
                    service TestService {
                        ${annotationBase}: { ${baseProps} }
                        ${businessKeyAnnotation}
                        entity ValidEntity1 { key ID: UUID; }

                        ${annotationBase}: { ${baseProps} }
                        ${businessKeyAnnotation}
                        entity ValidEntity2 { key ID: UUID; }

                        ${annotationBase}: { ${invalidProps} }
                        entity InvalidEntity { key ID: UUID; }
                    }
                `;

        const result = await validateModel(cdsSource);

        // Only InvalidEntity should have errors (missing required annotation)
        expect(result.errors.some((e) => e.msg.includes('InvalidEntity'))).toBe(true);
        expect(result.errors.some((e) => e.msg.includes('ValidEntity1'))).toBe(false);
        expect(result.errors.some((e) => e.msg.includes('ValidEntity2'))).toBe(false);
        expect(result.buildSucceeded).toBe(false);
      });
    },
  );
});

// Tests business key requirement for cancel, suspend, resume
describe('Business key validation tests', () => {
  const lifecycleAnnotations = [
    { annotationBase: PROCESS_CANCEL, annotationOn: PROCESS_CANCEL_ON },
    { annotationBase: PROCESS_SUSPEND, annotationOn: PROCESS_SUSPEND_ON },
    { annotationBase: PROCESS_RESUME, annotationOn: PROCESS_RESUME_ON },
  ];

  describe.each(lifecycleAnnotations)(
    'Business key required for $annotationBase',
    ({ annotationBase }) => {
      it('should ERROR when .on is defined but no business key annotation exists', async () => {
        const cdsSource = wrapEntity(`
                    ${annotationBase}: { on: 'UPDATE' }
                    entity NoBizKey { key ID: UUID; }
                `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (e) => e.msg.includes('business key') && e.msg.includes(annotationBase),
          ),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should ERROR when .on and .cascade are defined but no business key annotation exists', async () => {
        const cdsSource = wrapEntity(`
                    ${annotationBase}: { on: 'DELETE', cascade: true }
                    entity NoBizKeyCascade { key ID: UUID; }
                `);

        const result = await validateModel(cdsSource);

        expect(result.errors.length).toBeGreaterThan(0);
        expect(
          result.errors.some(
            (e) => e.msg.includes('business key') && e.msg.includes(annotationBase),
          ),
        ).toBe(true);
        expect(result.buildSucceeded).toBe(false);
      });

      it('should PASS with @bpm.process.businessKey expression', async () => {
        const cdsSource = wrapEntity(`
                    ${annotationBase}: { on: 'UPDATE' }
                    @bpm.process.businessKey: (ID)
                    entity WithBusinessKey { key ID: UUID; }
                `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });

      it('should PASS with @bpm.process.businessKey composite expression', async () => {
        const cdsSource = wrapEntity(`
                    ${annotationBase}: { on: 'UPDATE' }
                    @bpm.process.businessKey: (name || '-' || ID)
                    entity WithCompositeBusinessKey { key ID: UUID; name: String; }
                `);

        const result = await validateModel(cdsSource);

        expect(result.errors).toHaveLength(0);
        expect(result.buildSucceeded).toBe(true);
      });
    },
  );

  it('should NOT require business key for @bpm.process.start', async () => {
    const cdsSource = wrapEntity(`
                @bpm.process.start: { id: 'someProcess', on: 'CREATE' }
                entity StartNoBizKey { key ID: UUID; }
            `);

    const result = await validateModel(cdsSource);

    expect(result.errors.some((e) => e.msg.includes('business key'))).toBe(false);
    expect(result.buildSucceeded).toBe(true);
  });

  it('should NOT require business key for entities without process annotations', async () => {
    const cdsSource = wrapEntity(`
                entity PlainEntity { key ID: UUID; name: String; }
            `);

    const result = await validateModel(cdsSource);

    expect(result.errors).toHaveLength(0);
    expect(result.buildSucceeded).toBe(true);
  });
});
