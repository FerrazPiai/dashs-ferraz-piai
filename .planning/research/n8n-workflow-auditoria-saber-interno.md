# Workflow n8n `uiUUXegcBHe3z2fg` — Documentação para Internalização

> Objetivo: replicar internamente o extrator/analisador que hoje alimenta o painel
> `client/dashboards/TorreDeControle/`, removendo a dependência do n8n.

## Metadata

| Campo | Valor |
|---|---|
| **Nome** | `# 6 - Auditoria Saber Extrator De Dados` |
| **ID** | `uiUUXegcBHe3z2fg` |
| **Ativo** | `true` |
| **Nodes** | 48 |
| **Trigger** | Webhook POST |
| **URL produção** | `https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/5bc77f41-40be-446e-8774-611285886dda` |
| **Response mode** | `lastNode` — retorna JSON do primeiro item do último node executado |
| **Consumido por** | `server/services/tc-analyzer.js` → `extractViaN8n(url, platform)` |

**Função de negócio:** dado um link (Figma, Google Drive/Slides, Miro ou Google Doc de transcrição),
o workflow extrai o conteúdo visual/textual, passa por visão computacional + LLM e devolve
um texto denso pronto para indexar em vector store / servir de contexto para auditoria de
entregas de projeto (fase "Saber" do método V4).

---

## 1. Entrada, Setup e Switch

### Input do webhook (POST body)

```json
{
  "url": "string",            // URL pública do artefato
  "plataform": "figma|google|miro|transcricao"
}
```

> ⚠️ **Typo preservado:** a chave é `plataform` (sem o 'a' final), não `platform`. O backend
> interno **precisa** manter essa convenção enquanto o workflow n8n estiver vivo.

### Node `Setup` (n8n-nodes-base.set)

Copia `body.url` e `body.plataform` para o item principal do fluxo.

```js
url       = $json.body.url
plataform = $json.body.plataform
```

### Node `Switch` (n8n-nodes-base.switch)

Um único discriminador: `$json.plataform`. Quatro saídas mutuamente exclusivas.

| Saída | Valor esperado | Primeiro node | Terminal (aggregate) |
|---|---|---|---|
| 0 | `figma` | `Extract File Key` | `Aggregate2` |
| 1 | `google` | `Copy file` (GDrive) | `Aggregate3` |
| 2 | `miro` | `Configuração - Variáveis` | `Aggregate5` |
| 3 | `transcricao` | `Get a document` (GDocs) | `Aggregate6` |

Qualquer valor fora dessa lista faz o workflow **terminar silenciosamente** — o webhook
retorna o próprio payload de entrada e o `tc-analyzer.js` marca `status_avaliacao = "incompleta"`.

### Mapeamento dos valores do dashboard

O backend converte os rótulos do Kommo para os valores que o Switch aceita:

| Kommo / label interno | `plataform` enviado |
|---|---|
| `figma` | `figma` |
| `miro` | `miro` |
| `transcricao` | `transcricao` |
| `slides` | `google` |
| `reuniao` | `google` |

Ver `server/services/tc-analyzer.js:27` (constante `PLATFORM_TO_N8N`).

---

## 2. Branch `figma`

**Objetivo:** exportar cada página do arquivo Figma como PNG, analisar cada PNG com GPT-4o
(visão) e consolidar tudo em uma narrativa de auditoria com GPT-4.1.

### Fluxo

```
Extract File Key → GET File Structure → Code (mapeia páginas) → Imagens (export PNG)
  → Code1 (casa IDs x URLs) → Filter → Loop Over Items ⇄ Analyze image → Wait
  → Aggregate → Message a model → Aggregate2 (resposta final)
```

### APIs externas

| Endpoint | Método | Auth | Uso |
|---|---|---|---|
| `https://api.figma.com/v1/files/{fileKey}` | GET | `X-Figma-Token` | lê `document.children` (páginas) |
| `https://api.figma.com/v1/images/{fileKey}?ids={ids}&format=png&scale=1` | GET | `X-Figma-Token` | retorna `{ images: { nodeId: pngUrl } }` |
| `{pngUrl}` (CDN do Figma) | GET | — | binário PNG de cada página |
| OpenAI `gpt-4o` (image.analyze) | — | API key | análise rica de cada slide |
| OpenAI `gpt-4.1` (chat, JSON schema) | — | API key | narrativa final consolidada |

### Lógica relevante (Code nodes)

- **Extract File Key** — regex `figma\.com\/(?:file|design|proto|slides|deck)\/([a-zA-Z0-9]+)`
  extrai `fileKey`, monta `url_get_file` e `url_export_png`.
- **Code (pós-GET file)** — gera lista `{ page_id, page_name, page_index }` e monta
  `url_export_with_ids` com todos os `nodeIds` juntos (uma única chamada de export).
- **Code1** — cruza `images[nodeId] → pngUrl` com a lista de páginas, emite 1 item por página.
- **Loop Over Items + Wait** — batch 1-a-1 com pausa para não estourar rate limit da OpenAI.

### Saída (`Aggregate2`)

```json
{
  "data": [
    { "message": { "content": "<narrativa pt-BR>" }, "...": "metadados OpenAI" }
  ]
}
```

O consumidor final usa `data[0].message.content` como o texto de auditoria.

### Token Figma (hardcoded no workflow)

`X-Figma-Token: <REDACTED — token Figma hardcoded no workflow original>` — mover
para `.env` na internalização (`FIGMA_TOKEN`).

> **Nota de segurança (2026-04-24):** o token original foi removido deste arquivo
> porque o GitHub Secret Scanning bloqueou o push. O token deve ter sido revogado
> no Figma settings assim que este commit foi detectado.

---

## 3. Branch `google` (usado para `slides` e `reuniao`)

**Objetivo:** baixar um arquivo do Google Drive, converter para PDF e aplicar OCR via
Mistral, retornando o conteúdo em markdown com anotações de imagens embutidas.

### Fluxo

```
Copy file (GDrive) → Download file (→ PDF) → Upload Mistral → Signed URL
  → OCR Retry → Split Out (pages) → Code "Unindo Image Annotation's com Markdown"
  → Aggregate3 (resposta final)
```

### APIs externas

| Endpoint | Método | Auth | Uso |
|---|---|---|---|
| Google Drive API `files.copy` | POST | OAuth2 (credencial n8n) | copia o arquivo de origem para a pasta `1AAGx7VFDE1BcXrfQuWt2tmEyXE-1OFE1` |
| Google Drive API `files.get?alt=media` | GET | OAuth2 | baixa já convertendo Docs/Slides/Sheets → `application/pdf` |
| `https://api.mistral.ai/v1/files` | POST (multipart) | `Bearer` Mistral | upload do PDF com `purpose=ocr` |
| `https://api.mistral.ai/v1/files/{id}/url` | GET | `Bearer` Mistral | gera URL assinada para leitura |
| `https://api.mistral.ai/v1/ocr` | POST | `Bearer` Mistral | OCR completo com `model=mistral-ocr-latest` |

### Particularidades do OCR

Body enviado para `/v1/ocr`:

```json
{
  "model": "mistral-ocr-latest",
  "document": { "type": "document_url", "document_url": "<signed url>" },
  "include_image_base64": true,
  "bbox_annotation_format": {
    "type": "text",
    "json_schema": {
      "name": "visual_descriptions_only",
      "description": "Descrições concisas de cada elemento visual (imagem, gráfico, tabela, diagrama)."
    }
  }
}
```

Retorno do Mistral contém `pages[]` com `markdown` + `images[] { id, image_annotation }`.
O node **Split Out** separa uma entrada por página e o **Code "Unindo Image Annotation's com Markdown"**
injeta cada `image_annotation` no markdown, substituindo `![id](id)` por
`![id]image description=<annotation>(id)`.

### Saída (`Aggregate3`)

```json
{
  "data": [
    { "markdown": "<markdown pt-BR com descrições inline>" }
  ]
}
```

### Limitação conhecida

Se a URL de entrada for um Google Slides "/edit" sem permissão de cópia (compartilhamento
restrito), o `Copy file` falha com 403 e o aggregate devolve item vazio. O backend detecta
isso como `status_avaliacao = incompleta`.

---

## 4. Branch `miro`

**Objetivo:** puxar todos os items do board pela API v2 do Miro, passar o JSON por um LLM
que gera narrativa semântica com tags `[img_XX]`, analisar cada imagem com GPT-4o vision
e devolver a narrativa final com as descrições das imagens inseridas.

### Fluxo

```
Configuração - Variáveis → Extrair Board ID do Link
  ├─ Buscar Info do Board        ┐
  └─ Buscar Items do Board (P.1) ┴→ Merge → Processar e Estruturar Dados Miro
  → Analisando Apresentação e Separando Imagem (GPT-4.1 + Think tool)
  → Split Out1 → Limit → Loop Over Items1
       ├─ Dados1 → liberando url → HTTP Request1 → Analyze image1 (GPT-4o) → Dados
       └─ (loop)
  → Aggregate4 → Code in JavaScript2 (substitui [img_XX][img_XX] pelas descrições)
  → Aggregate5 (resposta final)
```

### APIs externas

| Endpoint | Método | Auth | Uso |
|---|---|---|---|
| `https://api.miro.com/v2/boards/{boardId}` | GET | `Bearer <token>` | metadados do board |
| `https://api.miro.com/v2/boards/{boardId}/items` | GET | `Bearer <token>` | items (paginado — workflow só pega pág 1) |
| `https://api.miro.com/v2/boards/{boardId}/resources/images/{imageId}?format=preview&redirect=false` | GET | `Bearer <token>` | gera URL temporária pública do binário |
| `{url assinada do Miro}` | GET | `Bearer <token>` | baixa imagem para o GPT-4o |
| OpenAI `gpt-4.1` | — | API key | narrador do board (JSON schema) |
| OpenAI `gpt-4o` (image.analyze) | — | API key | descreve cada imagem isolada |

### Lógica relevante (Code nodes)

- **Extrair Board ID do Link** — regex `/board\/([^/?#]+)/` sobre `miro_link`.
- **Processar e Estruturar Dados Miro** — limpa HTML dos `content`, categoriza items em
  `frames`, `text_items`, `shapes`, `sticky_notes`, `images`, `cards`, `embeds`,
  `connectors`, `tables`, `mind_maps`, extrai `position`/`size`/`style`.
- **Code in JavaScript2** — para cada imagem retornada pelo vision, substitui
  `[img_XX][img_XX]` por `[img_XX]\n<descrição>\n[img_XX]` dentro do texto narrativo.

### Saída (`Aggregate5`)

```json
{
  "data": [
    { "descrição_miro": "<narrativa pt-BR com descrições de imagens inline>" }
  ]
}
```

### Token Miro (hardcoded)

`eyJtaXJvLm9yaWdpbiI6ImV1MDEifQ_0jYstpkSFQiBQKMPE2KAM06IRp0` no node `Configuração - Variáveis`
— mover para `.env` (`MIRO_TOKEN`).

### Limitação conhecida

Workflow **só lê a página 1** de `/items` (até 50 items). Boards grandes perdem items
— na internalização precisa implementar paginação via `cursor`.

---

## 5. Branch `transcricao`

**Objetivo:** ler o conteúdo de um Google Doc diretamente via API do Google Docs.

### Fluxo

```
Get a document (GDocs) → Aggregate6 (resposta final)
```

Node único usa o nó nativo `n8n-nodes-base.googleDocs` com `operation=get` e a URL do doc.

### API externa

| Endpoint | Método | Auth | Uso |
|---|---|---|---|
| Google Docs API `documents.get` | GET | OAuth2 (credencial n8n) | retorna estrutura completa do doc |

### Saída (`Aggregate6`)

```json
{
  "data": [
    {
      "title": "string",
      "body": {
        "content": [
          { "paragraph": { "elements": [ { "textRun": { "content": "..." } } ] } }
        ]
      }
    }
  ]
}
```

Para obter texto puro basta concatenar `paragraph.elements[].textRun.content`
de cada item em `body.content`. Sem OCR, sem LLM — é o branch mais barato e rápido.

---

## 6. Prompts OpenAI (referência resumida)

Os prompts completos são copiados aqui em forma condensada. O texto integral está no
arquivo `.planning/research/` (snapshot do workflow) e deve ser replicado fielmente na
versão interna para preservar o comportamento de auditoria.

### 6.1 `Analyze image` (Figma, `gpt-4o`, `detail=high`)

**System/Text:** "Analista especializado em interpretar slides de apresentações de projetos."
Recebe 1 imagem por vez. Deve descrever cada slide com contexto (intenção, destaques,
elementos, mensagem, riscos), preservar textos/números, marcar `[ILEGÍVEL]` quando
necessário e **não resumir**. Interpolações de contexto: `etapa_atual`, `nome_cliente`,
`data_inicio` do cliente.

### 6.2 `Message a model` (Figma, `gpt-4.1`, `temperature=0`, JSON schema strict)

**Role:** Agente Analista Estratégico Sênior, auditor de projetos.
**Output:** único campo `auditoria_narrativa_integral` (mínimo 800 palavras) cobrindo:
1. Visão geral/identidade visual
2. Posicionamento/gatilhos mentais
3. Dados reais e auditoria de status (foco)
4. Riscos, inconsistências, lacunas
5. Completude absoluta (não omitir nada)

Regras críticas: repetir nomes próprios (sem pronomes ambíguos), alta densidade semântica
para vector store, pt-BR, não inventar dados.

### 6.3 `Analisando Apresentação e Separando Imagem` (Miro, `gpt-4.1`, `maxTokens=8192`, JSON schema)

**Role:** narrador semântico de boards Miro.
**Responsabilidades:** limpeza de HTML, agrupamento espacial por `x/y`, hierarquia visual
por `fontSize`, narrativa textual detalhada, **inserção de tags `[img_XX][img_XX]`** onde
cada imagem aparece, destaque de métricas e sticky notes.
**Ferramenta auxiliar:** `toolThink` (n8n langchain).
**Output schema:** `{ description: string, images: [{ tag, url, id }], summary: string }`.

### 6.4 `Analyze image1` (Miro, `gpt-4o`, `image.analyze`)

**Role:** vision computacional para imagens isoladas de boards (screenshots, dashboards,
gráficos, logos). Descreve cada imagem de forma que o texto seja inserido no lugar das
tags `[img_XX]` geradas pelo 6.3.

---

## 7. Dependências externas e credenciais

### Resumo de serviços

| Serviço | Usado em | Credencial no workflow | Credencial interna sugerida |
|---|---|---|---|
| Figma REST API | `figma` | `X-Figma-Token` hardcoded | `FIGMA_TOKEN` no `.env` |
| OpenAI (gpt-4o + gpt-4.1) | `figma`, `miro` | credencial n8n | `OPENAI_API_KEY` (já existe) |
| Google Drive API | `google` | OAuth2 (credencial n8n) | Service Account com escopo `drive` |
| Mistral OCR | `google` | credencial n8n | `MISTRAL_API_KEY` no `.env` |
| Miro REST v2 | `miro` | token hardcoded | `MIRO_TOKEN` no `.env` |
| Google Docs API | `transcricao` | OAuth2 (credencial n8n) | Service Account com escopo `documents.readonly` |

### Observações de custo

- OpenAI domina o custo (GPT-4o por imagem + GPT-4.1 na narrativa final). Cache de
  resposta por hash de URL/conteúdo já existe em `tc_extracoes` — manter.
- Mistral OCR só é cobrado no branch `google`.
- Figma, Miro e Google Docs APIs são gratuitas dentro dos limites.

### Rate limits críticos

- Figma: 2 req/s por token — workflow evita problema com uma única chamada de export.
- OpenAI: workflow usa `Loop Over Items` + `Wait` (figma) e `Loop Over Items1` (miro)
  para serializar; internalizar com `p-limit` ou similar.
- Mistral OCR: `OCR Retry` indica falhas esporádicas — implementar retry exponencial.
- Miro: 100 req/min por aplicação — OK para o uso atual.

---

## 8. Plano de implementação interno

### Arquitetura proposta

```
server/services/extractors/
  ├─ index.js                   // extractContent(url, platform) — substitui extractViaN8n
  ├─ figma-extractor.js         // branch figma
  ├─ google-extractor.js        // branch google (slides/reuniao)
  ├─ miro-extractor.js          // branch miro
  ├─ transcricao-extractor.js   // branch transcricao
  └─ shared/
      ├─ figma-api.js           // fileKey, file, images
      ├─ google-drive.js        // copy, download->pdf
      ├─ google-docs.js         // documents.get
      ├─ miro-api.js            // board, items, resources
      ├─ mistral-ocr.js         // upload, signed URL, ocr
      └─ openai-vision.js       // analyze(image, prompt), chat(json_schema)
```

### Dependências npm

| Lib | Uso |
|---|---|
| `openai` (oficial) | GPT-4o vision + GPT-4.1 chat/json_schema |
| `@mistralai/mistralai` ou `fetch` direto | upload, OCR |
| `googleapis` | Drive + Docs via Service Account |
| `p-limit` | serialização de chamadas OpenAI |
| `node:crypto` (já usado) | hash de cache |

### Interface unificada (contrato)

Retorno padronizado, independente da plataforma:

```ts
type ExtractionResult = {
  platform: 'figma' | 'google' | 'miro' | 'transcricao'
  content_full: string        // texto denso pronto para vector store
  content_medium?: string     // opcional — primeiros N chars
  content_short?: string      // opcional — resumo
  raw_shape: unknown          // shape original do branch (debug)
  status: 'ok' | 'empty' | 'error'
  error?: string
}
```

Isso encaixa direto no schema existente de `dashboards_hub.tc_extracoes`
(`conteudo_full`, `conteudo_medium`, `conteudo_short`, `hash_conteudo`).

### Estratégia de migração (incremental)

1. **Fase A — Paridade do branch `transcricao`:**
   implementar `transcricao-extractor.js` com Service Account Google, cobrir com teste
   ponta-a-ponta contra um doc real, feature-flag `USE_INTERNAL_EXTRACTOR=transcricao`.
2. **Fase B — Branch `google`:** Drive + Mistral OCR (mais simples que o resto porque não
   depende de vision OpenAI). Feature-flag aceita lista CSV.
3. **Fase C — Branch `figma`:** mais caro, requer orquestração do loop de visão.
   Validar que a narrativa final tem densidade semelhante (comparar com saídas n8n já no DB).
4. **Fase D — Branch `miro`:** último, por causa do prompt grande e paginação de items.
5. **Fase E — Cutover:** remover `extractViaN8n` e a env `N8N_EXTRACT_WEBHOOK_URL`.

Durante A→D, o `tc-analyzer.js` escolhe a rota por env; ambas populam a mesma tabela.

---

## 9. Checklist de desacoplamento

### Pré-requisitos

- [ ] Criar credenciais internas:
  - [ ] `FIGMA_TOKEN` (copiar do node do workflow)
  - [ ] `MIRO_TOKEN` (copiar do node `Configuração - Variáveis`)
  - [ ] `MISTRAL_API_KEY`
  - [ ] Service Account Google com escopos `drive` + `documents.readonly`
    + pasta `1AAGx7VFDE1BcXrfQuWt2tmEyXE-1OFE1` compartilhada com o SA
- [ ] Adicionar variáveis no `.env.example` e nos envs do Easypanel
- [ ] Garantir que `OPENAI_API_KEY` tem cota para GPT-4o + GPT-4.1

### Implementação

- [ ] Criar pasta `server/services/extractors/` com a estrutura da seção 8
- [ ] Implementar `shared/` primeiro (clientes HTTP isolados)
- [ ] Portar prompts da seção 6 **literalmente** (mudar uma palavra muda o output)
- [ ] Manter cache em `dashboards_hub.tc_extracoes` com `hash_conteudo = sha256(content_full)`
- [ ] Respeitar o rate limiter existente (`n8nLimiter` vira `extractorLimiter`)
- [ ] Adicionar feature-flag `INTERNAL_EXTRACTORS` (CSV: `transcricao,google,figma,miro`)

### Qualidade / paridade

- [ ] Gravar 3–5 amostras por plataforma retornadas pelo n8n atual
- [ ] Rodar o extrator interno contra os mesmos URLs e comparar:
  - Tamanho do `content_full` (tolerância ±20%)
  - Presença dos mesmos números/nomes próprios
  - Para `figma`/`miro`: manter a densidade semântica (não resumir)
- [ ] Ajustar prompts só se a paridade estiver abaixo do limiar

### Cutover

- [ ] Remover `extractViaN8n` de `server/services/tc-analyzer.js`
- [ ] Remover `N8N_EXTRACT_WEBHOOK_URL` do `.env` e do Easypanel
- [ ] Atualizar `.planning/codebase/INTEGRATIONS.md` e `CLAUDE.md` do projeto
- [ ] Arquivar (não deletar) o workflow n8n como referência histórica

### Pós-cutover (melhorias que o workflow atual não cobre)

- [ ] Paginação completa dos items do Miro (cursor)
- [ ] Branch nativo para `slides` (sem depender de cópia pro Drive)
- [ ] Branch `reuniao` real com Whisper/AssemblyAI quando URL for áudio/vídeo
- [ ] Métricas de tempo e custo por plataforma em `tc_extracoes` (colunas novas)
