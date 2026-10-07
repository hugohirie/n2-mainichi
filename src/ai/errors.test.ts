import { describe, it, expect } from 'vitest';
import { AiError, classifyError } from './errors';

describe('classifyError', () => {
  it('maps HTTP statuses to user-facing kinds', () => {
    expect(classifyError({ status: 401 })).toBe('auth');
    expect(classifyError({ status: 403 })).toBe('auth');
    expect(classifyError({ status: 429 })).toBe('rate');
    expect(classifyError({ status: 529 })).toBe('server');
    expect(classifyError({ status: 500 })).toBe('server');
  });

  it('detects an exhausted credit balance', () => {
    expect(classifyError({ status: 400, message: 'Your credit balance is too low to access the Anthropic API.' })).toBe('billing');
  });

  it('treats fetch TypeErrors as network problems', () => {
    expect(classifyError(new TypeError('Failed to fetch'))).toBe('network');
  });

  it('keeps the kind of an existing AiError and falls back to unknown', () => {
    expect(classifyError(new AiError('rate', 'x'))).toBe('rate');
    expect(classifyError(new Error('boom'))).toBe('unknown');
  });
});
