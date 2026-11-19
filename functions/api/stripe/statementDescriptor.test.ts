import { describe, expect, it } from 'vitest';
import { STATEMENT_DESCRIPTOR, assertStatementDescriptor } from './statementDescriptor';

describe('statement descriptor', () => {
  it('accepts WONDRAL WORDS', () => {
    expect(STATEMENT_DESCRIPTOR).toBe('WONDRAL WORDS');
    expect(STATEMENT_DESCRIPTOR.length).toBeLessThanOrEqual(22);
    expect(assertStatementDescriptor(STATEMENT_DESCRIPTOR)).toBe('WONDRAL WORDS');
  });

  it('rejects an empty, oversized, or punctuated descriptor', () => {
    expect(() => assertStatementDescriptor('')).toThrow(/invalid_statement_descriptor/);
    expect(() => assertStatementDescriptor('WOND')).toThrow(/invalid_statement_descriptor/);
    expect(() => assertStatementDescriptor('WONDRAL WORDS EXTRA TEXT')).toThrow(
      /invalid_statement_descriptor/,
    );
    expect(() => assertStatementDescriptor("WONDRAL'S WORDS")).toThrow(/invalid_statement_descriptor/);
    expect(() => assertStatementDescriptor('WONDRAL*WORDS')).toThrow(/invalid_statement_descriptor/);
    expect(() => assertStatementDescriptor('123456')).toThrow(/invalid_statement_descriptor/);
  });
});
