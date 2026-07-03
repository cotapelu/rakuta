import { describe, it, expect } from 'vitest';
import generateCapabilityGuidelines from '../../../extensions/capability-system/guideline-generator.js';

describe('Guideline Generator', () => {
  describe('generateCapabilityGuidelines', () => {
    it('includes custom guidelines first', () => {
      const result = generateCapabilityGuidelines(
        'test.cap',
        { type: 'object', properties: { name: { type: 'string' } } },
        undefined,
        ['Custom rule: always use UTF-8']
      );
      const text = result.join('\n');
      expect(text.indexOf('Custom rule: always use UTF-8')).toBeLessThan(text.indexOf('Parameters:'));
    });

    it('includes Parameters section', () => {
      const result = generateCapabilityGuidelines('test', { type: 'object', properties: { name: { type: 'string' } } });
      expect(result.some(line => /Parameters/i.test(line))).toBe(true);
    });

    it('includes Examples section', () => {
      const result = generateCapabilityGuidelines('test', { type: 'object', properties: { name: { type: 'string' } } });
      expect(result.some(line => /Examples/i.test(line))).toBe(true);
    });

    it('produces no empty lines', () => {
      const result = generateCapabilityGuidelines('test', { type: 'object', properties: { name: { type: 'string' } } });
      expect(result).not.toContain('');
    });

    it('adds Returns section when outputSchema provided', () => {
      const result = generateCapabilityGuidelines('test', { type: 'object', properties: {} }, { type: 'object', properties: { ok: { type: 'boolean' } } });
      expect(result.some(line => /Returns/i.test(line))).toBe(true);
    });

    it('omits Returns section when outputSchema missing', () => {
      const result = generateCapabilityGuidelines('test', { type: 'object', properties: {} });
      expect(result.every(line => !/Returns/i.test(line))).toBe(true);
    });

    it('describes parameters with type and required/optional', () => {
      const schema = {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User identifier' },
          count: { type: 'number', description: 'Count' }
        },
        required: ['userId']
      };
      const text = generateCapabilityGuidelines('test', schema).join('\n');
      expect(text).toMatch(/userId.*string.*required/i);
      expect(text).toMatch(/count.*number.*optional/i);
    });

    it('handles array property', () => {
      const schema = {
        type: 'object',
        properties: {
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags' }
        }
      };
      const text = generateCapabilityGuidelines('test', schema).join('\n');
      expect(text).toMatch(/tags.*array/i);
    });

    it('handles nested object property', () => {
      const schema = {
        type: 'object',
        properties: {
          cfg: { type: 'object', description: 'Configuration' }
        }
      };
      const text = generateCapabilityGuidelines('test', schema).join('\n');
      expect(text).toMatch(/cfg.*object/i);
    });

    it('describes any type', () => {
      const schema = {
        type: 'object',
        properties: {
          data: {}
        }
      };
      const text = generateCapabilityGuidelines('test', schema).join('\n');
      expect(text).toMatch(/data.*any/i);
    });

    it('examples contain JSON representations', () => {
      const schema = {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      };
      const result = generateCapabilityGuidelines('cap', schema);
      const text = result.join('\n');
      // Look for code block with JSON or plain JSON
      const hasJsonBlock = text.includes('```json') && text.includes('```');
      const hasPlainJson = /\{.*"name".*:.*\}\}/s.test(text) || /\{.*"age"/s.test(text);
      expect(hasJsonBlock || hasPlainJson).toBe(true);
    });

    it('returns section lists output properties', () => {
      const output = {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' }
        }
      };
      const text = generateCapabilityGuidelines('test', { type: 'object', properties: {} }, output).join('\n');
      expect(text).toMatch(/success.*boolean/i);
      expect(text).toMatch(/message.*string/i);
    });

    it('handles simple non-object return', () => {
      const output = { type: 'string' };
      const text = generateCapabilityGuidelines('test', { type: 'object', properties: {} }, output).join('\n');
      expect(text).toMatch(/Returns/i);
      // Generic fallback description for simple returns
      expect(text).toMatch(/result object/i);
    });
  });
});
