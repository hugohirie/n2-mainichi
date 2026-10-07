# App de estudo para o JLPT N2 — Design

**Data:** 2026-10-07
**Status:** aguardando revisão

## 1. Objetivo e contexto

- **Usuário:** uma pessoa (uso pessoal). Já passou no JLPT N3, mas está esquecendo o idioma por falta de prática.
- **Meta:** passar no **JLPT N2 em julho de 2027** (~9 meses).
- **Problema central:** constância. O app deve fazer o usuário praticar **todos os dias**, mesmo pouco.
- **Critérios de sucesso:**
  1. O usuário pratica na maioria dos dias (sequência de dias visível).
  2. Vocabulário N3 esquecido é recuperado sem reestudar tudo do zero.
  3. Vocabulário e gramática N2 avançam em ritmo que cobre o conteúdo até a prova (~10 palavras novas/dia).
  4. O usuário faz exercícios de gramática e leitura no formato da prova regularmente.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA no **iPhone**, instalada na tela inicial. **Sem modo offline** (sempre com internet). |
| Arquitetura | Tudo no cliente: sem servidor próprio. Chamadas diretas à API do Claude. |
| Conteúdo | Dados abertos (vocabulário/kanji) + API do Claude para gerar definições, exemplos, questões e textos. |
| Escopo v1 | SRS de vocabulário (kanji embutido), gramática no formato da prova, leitura. |
| Sessão diária | Mínimo de ~10 min (conta para a sequência) + botão "continuar". |
| Idioma do app | **Japonês com apoio**: explicações em japonês simples; tradução/inglês ao tocar. A interface (botões, menus) em português. |
| Modelos | **Misto**: Claude Sonnet 5.5 (`claude-sonnet-5-5`) para definições/exemplos de palavras; Claude Opus 5.5 (`claude-opus-5-5`) para gramática e leitura. Configurável. |
| Custo | API cobrada à parte do plano Claude. Estimativa ~US$7–8/mês no uso típico. |

### Fora do escopo da v1 (YAGNI)

Listening, simulado cronometrado, questões de vocabulário no formato da prova (言い換え, 用法, 文脈規定), cards de kanji isolados, sincronização entre aparelhos, modo offline, múltiplos usuários.

## 3. Arquitetura

**Stack:** React + TypeScript + Vite. IndexedDB via Dexie. SDK oficial `@anthropic-ai/sdk` usado no navegador (opção de acesso direto do browser habilitada — aceitável porque a chave é do próprio usuário, no próprio aparelho). Testes com Vitest. Hospedagem estática no GitHub Pages.

**PWA:** apenas `manifest` + ícones para "Adicionar à Tela de Início" (abre em tela cheia e evita que o iOS apague os dados do site após 7 dias sem uso). Sem service worker de cache.

### Módulos

| Módulo | Responsabilidade | Depende de |
|---|---|---|
| `data/` | JSON estático de vocabulário N3/N2 e kanji, gerado por script a partir dos dados abertos; JSON de pontos de gramática N3/N2. Empacotado com o app. | — |
| `srs/` | Algoritmo FSRS: dado o estado de um item e uma nota (errei/difícil/bom/fácil), devolve o novo estado e a próxima data de revisão. Lógica pura, sem I/O. | — |
| `ai/` | Cliente da API do Claude. Funções: `gerarDetalhesPalavras(palavras[])`, `gerarQuestoesGramatica(ponto)`, `gerarLeitura(opcoes)`. Usa saída estruturada (JSON schema) e valida o resultado antes de devolvê-lo. | `storage/` (chave, modelo) |
| `session/` | Monta a sessão do dia (revisões vencidas, itens novos, exercícios) e controla o "continuar". Calcula a sequência de dias. | `srs/`, `storage/`, `ai/` |
| `storage/` | Esquema Dexie: progresso dos itens, conteúdo gerado, histórico de sessões, configurações. Exportar/importar backup JSON. | — |
| `ui/` | Telas: Hoje, Revisão de palavra, Triagem N3, Exercício de gramática, Leitura, Progresso, Configurações. | todos acima |

### Fluxo principal

1. O usuário abre o app e vê a tela **Hoje**: sequência de dias e o resumo da sessão (ex.: "12 revisões · 10 novas · 3 gramática").
2. Ao tocar em "Começar", `session/` monta a fila a partir de `storage/` + `srs/`.
3. Conteúdo que falta (definição de palavra nova, questões de gramática) é pedido a `ai/` e salvo em `storage/`.
4. Cada resposta atualiza o estado do item via `srs/` e grava em `storage/`.
5. Ao terminar a sessão mínima, o dia é marcado como cumprido e aparece "Continuar" (mais gramática, uma leitura, mais palavras novas).

## 4. Conteúdo

### 4.1 Vocabulário (kanji embutido)

O N2 cobra kanji dentro de palavras, então **não há cards de kanji isolados**.

**Card de palavra:**
- **Frente:** a palavra na forma escrita usual (ex.: 影響).
- **Verso:** leitura (えいきょう); definição curta em japonês simples; uma frase de exemplo com furigana nas palavras difíceis; toque para ver a glosa em inglês (JMdict); toque num kanji para ver leituras e significado (KANJIDIC2).
- **Nota:** o usuário marca errei / difícil / bom / fácil → FSRS.
- **Geração:** definição + exemplo gerados pelo Sonnet 5.5 **em lote** (as palavras novas do dia numa chamada só) quando a palavra entra pela primeira vez. Ficam salvos; cada palavra é gerada uma única vez.

**Ordem de introdução:**
1. **Triagem N3:** as palavras N3 aparecem em modo rápido "sei / não sei". "Sei" → entra no SRS com estado inicial de item já conhecido (intervalo longo). "Não sei" → vira card novo normal. A triagem roda dentro da sessão diária (ex.: 30 palavras por sessão) até cobrir o N3.
2. **N2 novo:** ordenadas pela frequência do kanji mais raro da palavra (palavras com kanji mais comuns primeiro; as listas não trazem frequência de palavra). Começa quando a triagem do N3 termina. Padrão: 10 novas por dia na sessão mínima (ajustável em Configurações).

### 4.2 Gramática

- **Lista de pontos:** JSON fixo no repositório com os pontos N3 (para revisão) e N2 (~200). Cada ponto tem: id, padrão (ex.: 〜にもかかわらず), nível, significado curto. A lista é montada uma vez com ajuda da IA e revisada no próprio repositório.
- Cada ponto é um item do SRS. Novos pontos entram em ritmo próprio (padrão: 1 por dia).
- **Ao vencer**, o Opus 5.5 gera 2–3 questões no formato da prova:
  - **文法形式の判断:** frase com lacuna, 4 alternativas.
  - **文の組み立て:** 4 peças a ordenar; a pergunta é qual peça fica na posição ★.
- Correção automática. Depois de responder, aparece a explicação em japonês simples (com tradução ao tocar).
- **Nota para o SRS:** todas certas → bom; uma errada → difícil; maioria errada → errei.
- As questões geradas ficam salvas. Revisões futuras do mesmo ponto geram questões novas; as antigas ficam no histórico.

### 4.3 Leitura (no "continuar")

- O Opus 5.5 gera um **短文 (~200字)** ou **中文 (~500字)** de nível N2, incluindo de preferência palavras que o usuário está aprendendo, com 1–3 perguntas de múltipla escolha.
- Depois de responder: justificativa de cada alternativa; toque nas palavras para ver leitura e significado.
- Salvo no histórico. Leitura não entra no SRS.

### 4.4 Qualidade do conteúdo gerado

- Os prompts exigem saída estruturada: para questões, enunciado, alternativas, índice da correta e justificativa de cada alternativa.
- O app valida o JSON (campos obrigatórios, exatamente uma alternativa correta, 4 alternativas). Se for inválido: tenta de novo uma vez e, se falhar, pula o item.
- Em todo exercício, o botão **"questão com problema"** marca o item como descartado; ele não é mais exibido nem conta para o SRS.

## 5. Dados e fontes

| Dado | Fonte | Licença |
|---|---|---|
| Vocabulário N3/N2 com leitura e glosa em inglês | Listas JLPT do tanos.co.uk, via `jamsinclair/open-anki-jlpt-decks` (CSV) | MIT (repositório); dados do tanos.co.uk |
| Kanji (leituras, significados, frequência) | KANJIDIC2 (EDRDG), via `davidluzgouveia/kanji-data` (JSON) | CC-BY-SA 4.0 |
| Pontos de gramática | Lista própria (gerada com IA e revisada) | — |

O JLPT não publica listas oficiais desde 2010; as listas comunitárias são uma aproximação aceita (~2.000 palavras N3 e ~1.900 N2). As glosas em inglês já vêm nas listas, então não é preciso cruzar com o JMdict. Os créditos ficam na tela de Configurações.

Um script de preparação (Node, roda no PC, não no app) baixa as fontes e gera os JSONs em `data/`. Os JSONs gerados são versionados no repositório.

## 6. Armazenamento local (IndexedDB)

Tabelas principais:
- `items`: id, tipo (palavra | gramática), referência ao dado estático, estado FSRS, próxima revisão, descartado.
- `wordDetails`: id da palavra, definição em japonês, exemplo, data de geração.
- `exercises`: id, ponto de gramática ou leitura, conteúdo JSON, resposta do usuário, acerto, descartado.
- `sessions`: data, sessão mínima cumprida (sim/não), contagens.
- `settings`: chave da API, modelos escolhidos, novas por dia, data do último backup, contador de uso.

**Backup:** exportar todas as tabelas para um arquivo JSON (salvo via app Arquivos do iPhone) e importar para restaurar. Lembrete na tela Hoje quando o último backup tiver mais de 7 dias.

## 7. Chave da API e custo

- Na primeira abertura, o app pede a chave da API da Anthropic (o usuário cria em console.anthropic.com, com créditos pré-pagos e limite de gasto mensal). A chave fica só no IndexedDB do aparelho.
- A tela de Configurações mostra um contador de uso do mês (tokens de entrada/saída por modelo, a partir do campo `usage` das respostas) e um custo aproximado.
- O conteúdo gerado nunca é pedido duas vezes.

## 8. Tratamento de erros

| Situação | Comportamento |
|---|---|
| API indisponível / sem conexão / limite (429, 5xx) | O SDK já tenta de novo; se ainda falhar, a sessão continua só com itens que não precisam da IA e mostra um aviso. |
| Chave inválida (401) | Aviso "chave inválida — verifique em Configurações"; a sessão continua sem IA. |
| Recusa do modelo (`stop_reason: "refusal"`) | Trata como resposta inválida (tenta de novo uma vez, depois pula). |
| JSON inválido | Tenta de novo uma vez; depois pula o item. |
| Palavra nova sem definição gerada | Mostra a glosa do JMdict como reserva. |
| Dados perdidos | Restaurar pelo backup. |

## 9. Testes

**Automáticos (Vitest)**, só na lógica pura, sem chamar a API:
- `srs/`: agendamento FSRS para cada nota; estado inicial de item "já conhecido" da triagem.
- `session/`: montagem da sessão (vencidos + novos + limites); sequência de dias (incluindo dia pulado e virada de dia).
- `ai/`: validação de respostas com exemplos válidos e inválidos (fixtures).
- `storage/`: exportar → importar → dados iguais.
- Script de dados: parsing do CSV, remoção de duplicatas entre N3 e N2 e ordenação pela frequência dos kanji.

**Manuais no iPhone:** instalar na tela inicial; fazer uma sessão completa; usar o "continuar"; exportar e restaurar o backup.

## 10. Riscos conhecidos

- **Qualidade da IA em gramática fina:** mitigada pelo Opus 5.5, pela validação e pelo botão "questão com problema".
- **Listas JLPT não oficiais:** aceitável; a cobertura de frequência compensa.
- **Chave no navegador:** aceitável para uso pessoal num aparelho próprio. Migrar para um proxy (Cloudflare Worker) é possível depois, sem mudar o resto.
- **Armazenamento do iOS:** mitigado pela instalação na tela inicial e pelo backup.
