import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';

export type Effort = 'low' | 'medium' | 'high';

export interface LlmCall<T> {
  model: string;
  system: string;
  user: string;
  schema: z.ZodType<T>;
  effort: Effort;
  maxTokens: number;
}

export interface LlmResult<T> {
  data: T | null;
  inputTokens: number;
  outputTokens: number;
}

export type Llm = <T>(call: LlmCall<T>) => Promise<LlmResult<T>>;

/** Modelos que rejeitam o parâmetro `effort`. */
const NO_EFFORT_MODELS = new Set(['claude-haiku-4-5']);

export function buildParams<T>(call: LlmCall<T>) {
  const format = zodOutputFormat(call.schema);
  return {
    model: call.model,
    max_tokens: call.maxTokens,
    system: call.system,
    messages: [{ role: 'user' as const, content: call.user }],
    output_config: NO_EFFORT_MODELS.has(call.model) ? { format } : { effort: call.effort, format },
  };
}

export function createLlm(apiKey: string): Llm {
  // A chave é do próprio usuário e fica só no aparelho dele (ver spec, seção 7).
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return async <T>(call: LlmCall<T>): Promise<LlmResult<T>> => {
    const res = await client.messages.parse(buildParams(call));
    const refused = res.stop_reason === 'refusal';
    return {
      data: refused ? null : ((res.parsed_output as T | null) ?? null),
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    };
  };
}
