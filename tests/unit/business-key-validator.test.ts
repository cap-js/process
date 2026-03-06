import { validateBusinessKey } from '../../lib/processImport/business-key-validator';

describe('Business Key Validator', () => {
  describe('Valid Business Keys', () => {
    const validCases: { input: string | undefined; description: string }[] = [
      { input: undefined, description: 'undefined' },
      { input: '', description: 'empty string' },
      { input: 'simple-constant', description: 'simple constant' },
      { input: 'ORDER-123', description: 'constant with hyphen and numbers' },
      { input: 'prefix_suffix', description: 'constant with underscore' },
      { input: '${context.startEvent.id}', description: 'simple variable' },
      { input: '${context.startEvent.orderId}', description: 'variable with camelCase' },
      { input: '${context.startEvent.order_id}', description: 'variable with underscore' },
      { input: '${context.startEvent._private}', description: 'variable starting with underscore' },
      { input: '${context.startEvent.customer.name}', description: 'nested property' },
      {
        input: '${context.startEvent.customer.address.city}',
        description: 'deeply nested property',
      },
      { input: 'ORD-${context.startEvent.orderId}', description: 'prefix + variable' },
      { input: '${context.startEvent.orderId}-SUFFIX', description: 'variable + suffix' },
      {
        input: 'PREFIX-${context.startEvent.orderId}-SUFFIX',
        description: 'prefix + variable + suffix',
      },
      {
        input: '${context.startEvent.a}${context.startEvent.b}',
        description: 'two consecutive variables',
      },
      {
        input: '${context.startEvent.ssn} -${context.startEvent.age}',
        description: 'two variables with separator',
      },
      { input: 'PRICE$100', description: 'literal $ not followed by {' },
      { input: '$$test', description: 'multiple $ as literal' },
      { input: '$notvar', description: 'single $ followed by text' },
      { input: 'order{123}', description: 'literal { and } in constant' },
      { input: 'test}value', description: 'literal } in constant' },
      { input: 'test{value', description: 'literal { in constant' },
      {
        input: '${context.startEvent.a}-${context.startEvent.b}-${context.startEvent.c}',
        description: 'three variables',
      },
    ];

    validCases.forEach(({ input, description }) => {
      it(`should accept: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });

  describe('Invalid Business Keys - Wrong Prefix', () => {
    const invalidPrefixCases: { input: string; expectedError: string; description: string }[] = [
      {
        input: '${wrong.path}',
        expectedError: "'${wrong.path}' does not match expected format",
        description: 'completely wrong prefix',
      },
      {
        input: '${context.wrong.id}',
        expectedError: "'${context.wrong.id}' does not match expected format",
        description: 'wrong second part of prefix',
      },
      {
        input: '${ctx.startEvent.id}',
        expectedError: "'${ctx.startEvent.id}' does not match expected format",
        description: 'abbreviated context',
      },
      {
        input: '${Context.startEvent.id}',
        expectedError: "'${Context.startEvent.id}' does not match expected format",
        description: 'capitalized context',
      },
      {
        input: '${context.StartEvent.id}',
        expectedError: "'${context.StartEvent.id}' does not match expected format",
        description: 'capitalized startEvent',
      },
      {
        input: 'prefix-${invalid.var}',
        expectedError: "'${invalid.var}' does not match expected format",
        description: 'invalid variable after prefix',
      },
    ];

    invalidPrefixCases.forEach(({ input, expectedError, description }) => {
      it(`should reject: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Invalid Business Keys - Missing Property Name', () => {
    const missingPropertyCases: { input: string; expectedError: string; description: string }[] = [
      {
        input: '${context.startEvent.}',
        expectedError: 'is missing property name',
        description: 'empty property name',
      },
      {
        input: '${context.startEvent.foo.}',
        expectedError: 'is missing property name',
        description: 'empty nested property name',
      },
    ];

    missingPropertyCases.forEach(({ input, expectedError, description }) => {
      it(`should reject: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Invalid Business Keys - Invalid Property Name Start', () => {
    const invalidStartCases: { input: string; expectedError: string; description: string }[] = [
      {
        input: '${context.startEvent.123}',
        expectedError: "has invalid property name starting with '1'",
        description: 'property name starting with digit',
      },
      {
        input: '${context.startEvent.foo.456}',
        expectedError: "has invalid property name starting with '4'",
        description: 'nested property starting with digit',
      },
      {
        input: '${context.startEvent.-invalid}',
        expectedError: "has invalid property name starting with '-'",
        description: 'property name starting with hyphen',
      },
    ];

    invalidStartCases.forEach(({ input, expectedError, description }) => {
      it(`should reject: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Invalid Business Keys - Invalid Characters in Property Name', () => {
    const invalidCharCases: { input: string; expectedError: string; description: string }[] = [
      {
        input: '${context.startEvent.foo@bar}',
        expectedError: "contains invalid character '@'",
        description: 'property name with @',
      },
      {
        input: '${context.startEvent.foo-bar}',
        expectedError: "contains invalid character '-'",
        description: 'property name with hyphen',
      },
      {
        input: '${context.startEvent.foo bar}',
        expectedError: "contains invalid character ' '",
        description: 'property name with space',
      },
      {
        input: '${context.startEvent.foo$bar}',
        expectedError: "contains invalid character '$'",
        description: 'property name with $',
      },
    ];

    invalidCharCases.forEach(({ input, expectedError, description }) => {
      it(`should reject: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Invalid Business Keys - Incomplete Variables', () => {
    const incompleteCases: { input: string; expectedError: string; description: string }[] = [
      {
        input: '${context.startEvent.id',
        expectedError: "is incomplete, missing closing '}'",
        description: 'missing closing brace',
      },
      {
        input: '${context.startEvent.',
        expectedError: "is incomplete, missing closing '}'",
        description: 'incomplete after prefix',
      },
      {
        input: '${context.start',
        expectedError: "is incomplete, missing closing '}'",
        description: 'incomplete prefix',
      },
      {
        input: '${',
        expectedError: "is incomplete, missing closing '}'",
        description: 'just opening',
      },
      {
        input: 'prefix-${context.startEvent.id',
        expectedError: "is incomplete, missing closing '}'",
        description: 'incomplete variable after prefix',
      },
    ];

    incompleteCases.forEach(({ input, expectedError, description }) => {
      it(`should reject: ${description} ("${input}")`, () => {
        const result = validateBusinessKey(input);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain(expectedError);
      });
    });
  });

  describe('Invalid Business Keys - Trailing $', () => {
    it('should reject trailing $ without variable reference', () => {
      const result = validateBusinessKey('test$');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Trailing '$' without variable reference");
    });

    it('should reject multiple trailing $', () => {
      const result = validateBusinessKey('test$$');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Trailing '$' without variable reference");
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long property paths', () => {
      const result = validateBusinessKey('${context.startEvent.a.b.c.d.e.f.g.h.i.j}');
      expect(result.isValid).toBe(true);
    });

    it('should handle property names with numbers', () => {
      const result = validateBusinessKey('${context.startEvent.field123}');
      expect(result.isValid).toBe(true);
    });

    it('should handle property names with underscores', () => {
      const result = validateBusinessKey('${context.startEvent.field_123_name}');
      expect(result.isValid).toBe(true);
    });

    it('should handle mixed content with multiple variables and constants', () => {
      const result = validateBusinessKey('A-${context.startEvent.a}-B-${context.startEvent.b}-C');
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in constants around variables', () => {
      const result = validateBusinessKey('!@#${context.startEvent.id}%^&');
      expect(result.isValid).toBe(true);
    });
  });
});
