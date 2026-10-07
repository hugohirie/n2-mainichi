import Anthropic from '@anthropic-ai/sdk';

export type AiErrorKind = 'auth' | 'billing' | 'network' | 'rate' | 'server' | 'unknown';

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

export function classifyError(e: unknown): AiErrorKind {
  if (e instanceof AiError) return e.kind;
  if (e instanceof Anthropic.APIConnectionError || e instanceof TypeError) return 'network';
  const { status, message } = (e ?? {}) as { status?: unknown; message?: unknown };
  if (typeof status === 'number') {
    if (status === 401 || status === 403) return 'auth';
    if (status === 429) return 'rate';
    if (status >= 500) return 'server';
    if (status === 400 && typeof message === 'string' && /credit balance/i.test(message)) return 'billing';
  }
  return 'unknown';
}

export const AI_ERROR_MESSAGES: Record<AiErrorKind, string> = {
  auth: 'Chave da API inválida — verifique em Configurações.',
  billing: 'Os créditos da API acabaram — recarregue em console.anthropic.com.',
  network: 'Sem conexão com a API. Tente de novo em instantes.',
  rate: 'Limite de uso da API atingido. Tente de novo mais tarde.',
  server: 'A API está com problemas no momento. Tente de novo mais tarde.',
  unknown: 'Erro inesperado ao falar com a API.',
};
