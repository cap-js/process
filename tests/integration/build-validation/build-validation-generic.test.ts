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
    PROCESS_START_ID, 
    PROCESS_START_IF, 
    PROCESS_START_ON, 
    PROCESS_SUSPEND, 
    PROCESS_SUSPEND_CASCADE, 
    PROCESS_SUSPEND_IF, 
    PROCESS_SUSPEND_ON 
} from "../../../lib/constants";
import { validateModel, wrapEntity } from "./helpers";

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
        ({ annotationBase, annotationOn, annotationCascade }) => {

            describe('Required annotations', () => {
                it('should PASS when both on and cascade are present', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { on: 'DELETE', cascade: true }
                        entity ValidEntity { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors).toHaveLength(0);
                    expect(result.buildSucceeded).toBe(true);
                });

                it('should ERROR when on is present but cascade is missing', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { on: 'DELETE' }
                        entity MissingCascade { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes(annotationOn) &&
                        e.msg.includes('requires') &&
                        e.msg.includes(annotationCascade)
                    )).toBe(true);
                    expect(result.buildSucceeded).toBe(false);
                });

                it('should ERROR when cascade is present but on is missing', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { cascade: true }
                        entity MissingOn { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes(annotationCascade) &&
                        e.msg.includes('requires') &&
                        e.msg.includes(annotationOn)
                    )).toBe(true);
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
        }
    );
});

// Tests ON annotation for all process annotations
describe('.on annotation tests ', () => {
    interface AnnotationConfig {
        annotationBase: string;
        annotationOn: string;
        baseProps: string;
    }

    const annotationConfigs: AnnotationConfig[] = [
        {
            annotationBase: PROCESS_START,
            annotationOn: PROCESS_START_ON,
            baseProps: `id: 'someID'`,
        },
        {
            annotationBase: PROCESS_CANCEL,
            annotationOn: PROCESS_CANCEL_ON,
            baseProps: 'cascade: true',
        },
        {
            annotationBase: PROCESS_SUSPEND,
            annotationOn: PROCESS_SUSPEND_ON,
            baseProps: 'cascade: true',
        },
        {
            annotationBase: PROCESS_RESUME,
            annotationOn: PROCESS_RESUME_ON,
            baseProps: 'cascade: true',
        },
    ];

    describe.each(annotationConfigs)(
        'Build Validation: $annotationOn',
        ({ annotationBase, annotationOn, baseProps }) => {

            describe('Valid events', () => {
                it('should PASS with CRUD events', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'CREATE' }
                        entity OnCreate { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'UPDATE' }
                        entity OnUpdate { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'DELETE' }
                        entity OnDelete { key ID: UUID; }

                        ${annotationBase}: { ${baseProps}, on: 'READ' }
                        entity OnRead { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);
                    expect(result.errors).toHaveLength(0);
                    expect(result.buildSucceeded).toBe(true);
                });

                it('should PASS when on references a valid bound action', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'customAction' }
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
                        entity InvalidEvent { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes('must be either a lifecycle event') ||
                        e.msg.includes('action')
                    )).toBe(true);
                    expect(result.buildSucceeded).toBe(false);
                });

                it('should ERROR when on is lowercase (case sensitive)', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'delete' }
                        entity LowercaseEvent { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.buildSucceeded).toBe(false);
                });

                it('should ERROR when on is mixed case', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: 'Delete' }
                        entity MixedCaseEvent { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.buildSucceeded).toBe(false);
                });

                it('should ERROR when on is empty string', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, on: '' }
                        entity EmptyOn { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.buildSucceeded).toBe(false);
                });
            });
        });
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
                        entity CascadeTrue { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);
                    expect(result.errors).toHaveLength(0);
                    expect(result.buildSucceeded).toBe(true);
                });

                it('should PASS when cascade is false', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: false }
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
                        entity CascadeString { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes(annotationCascade) &&
                        e.msg.includes('boolean')
                    )).toBe(true);
                    expect(result.buildSucceeded).toBe(false);
                });

                it('should ERROR when cascade is a number instead of boolean', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: { ${baseProps}, cascade: 1 }
                        entity CascadeNumber { key ID: UUID; }
                    `);

                    const result = await validateModel(cdsSource);

                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes(annotationCascade) &&
                        e.msg.includes('boolean')
                    )).toBe(true);
                    expect(result.buildSucceeded).toBe(false);
                });
            });
        }
    );
});

// Tests if annotation for all process annotations
describe('.if annotation tests', () => {

    interface AnnotationConfig {
        annotationBase: string;
        annotationIf: string;
        baseProps: string;
    }
    
    const annotationConfigs: AnnotationConfig[] = [
        {
            annotationBase: PROCESS_START,
            annotationIf: PROCESS_START_IF,
            baseProps: `id: 'someProcess', on: 'UPDATE'`,
        },
        {
            annotationBase: PROCESS_CANCEL,
            annotationIf: PROCESS_CANCEL_IF,
            baseProps: `on: 'UPDATE', cascade: true`,
        },
        {
            annotationBase: PROCESS_RESUME,
            annotationIf: PROCESS_RESUME_IF,
            baseProps: `on: 'UPDATE', cascade: true`,
        },
        {
            annotationBase: PROCESS_SUSPEND,
            annotationIf: PROCESS_SUSPEND_IF,
            baseProps: `on: 'UPDATE', cascade: true`,
        },
    ];
    
    describe.each(annotationConfigs)(
        'Build Validation: $annotationIf',
        ({ annotationBase, annotationIf, baseProps }) => {
    
            describe('Valid expressions', () => {
                it('should PASS with simple comparison expression', async () => {
                    const cdsSource = wrapEntity(`
                        ${annotationBase}: {
                            ${baseProps},
                            if: (status = 'CANCELLED')
                        }
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
                        entity InvalidWhen {
                            key ID: UUID;
                            retryCount: Integer;
                        }
                    `);
    
                    const result = await validateModel(cdsSource);
    
                    expect(result.errors.length).toBeGreaterThan(0);
                    expect(result.errors.some(e =>
                        e.msg.includes(annotationIf) &&
                        e.msg.includes('must be a valid expression')
                    )).toBe(true);
                    expect(result.buildSucceeded).toBe(false);
                });
            });
        }
    );
})

// Tests other edge cases for all process annotations
describe('other validation logic tests', () => {

    interface AnnotationConfig {
        annotationBase: string;
        baseProps: string;
        invalidProps: string;
    }

    const annotationConfigs: AnnotationConfig[] = [
        {
            annotationBase: PROCESS_START,
            baseProps: `id: 'someProcess', on: 'DELETE'`,
            invalidProps: `id: 'someProcess'`
        },
        {
            annotationBase: PROCESS_CANCEL,
            baseProps: `on: 'DELETE', cascade: true`,
            invalidProps: `on: 'DELETE'`
        },
        {
            annotationBase: PROCESS_SUSPEND,
            baseProps: `on: 'DELETE', cascade: true`,
            invalidProps: `on: 'DELETE'`
        },
        {
            annotationBase: PROCESS_RESUME,
            baseProps: `on: 'DELETE', cascade: true`,
            invalidProps: `on: 'DELETE'`
        },
    ];

    describe.each(annotationConfigs)(
        'Build Validation: $annotationBase other tests',
        ({ annotationBase, baseProps, invalidProps }) => {
            
            it('should WARN for multiple unknown annotations', async () => {
                const cdsSource = wrapEntity(`
                    ${annotationBase}: { ${baseProps} }
                    ${annotationBase}.foo: 'bar'
                    ${annotationBase}.baz: 123
                    entity MultipleUnknown { key ID: UUID; }
                `);

                const result = await validateModel(cdsSource);

                // Should have warnings for both unknown annotations
                expect(result.warnings.some(w => w.msg.includes('foo'))).toBe(true);
                expect(result.warnings.some(w => w.msg.includes('baz'))).toBe(true);
                expect(result.buildSucceeded).toBe(true);
            });

            it('should validate multiple entities independently', async () => {
                const cdsSource = `
                    service TestService {
                        ${annotationBase}: { ${baseProps} }
                        entity ValidEntity1 { key ID: UUID; }

                        ${annotationBase}: { ${baseProps} }
                        entity ValidEntity2 { key ID: UUID; }

                        ${annotationBase}: { ${invalidProps} }
                        entity InvalidEntity { key ID: UUID; }
                    }
                `;

                const result = await validateModel(cdsSource);

                // Only InvalidEntity should have errors (missing cascade)
                expect(result.errors.some(e => e.msg.includes('InvalidEntity'))).toBe(true);
                expect(result.errors.some(e => e.msg.includes('ValidEntity1'))).toBe(false);
                expect(result.errors.some(e => e.msg.includes('ValidEntity2'))).toBe(false);
                expect(result.buildSucceeded).toBe(false);
            });
            
        }
    );
});