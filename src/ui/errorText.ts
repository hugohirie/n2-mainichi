import { AI_ERROR_MESSAGES } from '../ai/errors';
import type { StartError } from '../session/service';

export function errorText(e: StartError): string {
  if (e === 'invalid') return 'Não consegui gerar um exercício válido desta vez.';
  if (e === 'no-ai') return 'Configure a chave da API em Configurações.';
  return AI_ERROR_MESSAGES[e];
}
