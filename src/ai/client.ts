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

export function createLlm(apiKey: string): Llm {
  // A chave é do próprio usuário e fica só no aparelho dele (ver spec, seção 7).
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  return async <T>(call: LlmCall<T>): Promise<LlmResult<T>> => {
    const res = await client.messages.parse({
      model: call.model,
      max_tokens: call.maxTokens,
      system: call.system,
      messages: [{ role: 'user', content: call.user }],
      output_config: { effort: call.effort, format: zodOutputFormat(call.schema) },
    });
    const refused = res.stop_reason === 'refusal';
    return {
      data: refused ? null : ((res.parsed_output as T | null) ?? null),
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    };
  };
}
