import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { buildParams } from './client';

const call = (model: string) => ({ model, system: 's', user: 'u', schema: z.object({ a: z.string() }), effort: 'low' as const, maxTokens: 100 });

describe('buildParams', () => {
  it('sends effort to models that support it', () => {
    expect(buildParams(call('claude-sonnet-5-5')).output_config).toHaveProperty('effort', 'low');
    expect(buildParams(call('claude-opus-5-5')).output_config).toHaveProperty('effort', 'low');
  });

  it('omits effort for Haiku 4.5, which rejects it', () => {
    const params = buildParams(call('claude-haiku-4-5'));
    expect(params.output_config).not.toHaveProperty('effort');
    expect(params.output_config).toHaveProperty('format');
  });
});
