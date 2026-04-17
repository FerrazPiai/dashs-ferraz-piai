# N8N Extraction Webhook — Shapes de Retorno

**Workflow:** `uiUUXegcBHe3z2fg` — "# 6 - Auditoria Saber Extrator De Dados"
**Webhook URL (prod):** `https://ferrazpiai-n8n-editor.uyk8ty.easypanel.host/webhook/5bc77f41-40be-446e-8774-611285886dda`
**Método:** POST
**Response mode:** "first entry of the last node executed" → sempre retorna um objeto JSON
**Investigado em:** 2026-04-17

---

## 🚨 BUGS CRÍTICOS DESCOBERTOS

### Bug #1 — Nome do campo no payload (typo no workflow)

O workflow lê `$json.plataform` (sem o 'a' final — typo). Nosso backend envia `{ url, platform }` (inglês). Resultado:

- `$json.plataform` é **undefined**
- O nó **Switch** não casa com nenhuma das 4 regras
- Workflow termina imediatamente → retorna o item recebido no webhook (ou vazio)
- Backend recebe JSON sem conteúdo → IA marca `status_avaliacao = "incompleta"` → UI mostra "Materiais insuficientes"

**Este é o motivo real de "análises não estão sendo geradas".**

### Bug #2 — Valores de `platform` não batem com branches do Switch

Backend envia um de: `slides`, `reuniao`, `transcricao`, `figma`, `miro`.
Switch do n8n tem apenas 4 branches: **`figma`**, **`google`**, **`miro`**, **`transcricao`**.

| Plataforma enviada | Casa branch? | Fix |
|---|---|---|
| `slides` | ❌ | Mapear para `google` |
| `reuniao` | ❌ | Mapear para `google` (ou não suportado — ver notas) |
| `transcricao` | ✅ | Manter |
| `figma` | ✅ | Manter |
| `miro` | ✅ | Manter |

### Bug #3 — Token Miro hardcoded no workflow

Node "Configuração - Variáveis" guarda `miro_token` em plaintext dentro do workflow. Risco baixo (workflow é privado), mas deveria ser credencial n8n.

---

## Input esperado pelo workflow

```json
{
  "url": "string",
  "plataform": "figma" | "google" | "miro" | "transcricao"
}
```

⚠️ Note: chave é `plataform` (typo), **não** `platform`.

---

## Arquitetura do Switch

| Switch output | Valor | Primeiro nó | Terminal node (resposta) |
|---|---|---|---|
| 0 | `figma` | Extract File Key | **Aggregate2** |
| 1 | `google` | Copy file (Google Drive) | **Aggregate3** |
| 2 | `miro` | Configuração - Variáveis | **Aggregate5** |
| 3 | `transcricao` | Get a document (Google Docs) | **Aggregate6** |

Todos os terminais são nós `aggregate` modo `aggregateAllItemData` → retornam `{ data: [...] }` envelopando todos os items.

---

## Shapes por plataforma

### `figma`
- Fluxo: Extract File Key → GET File Structure (Figma API) → Code (filtra frames) → Filter → Loop Over Items → Analyze image (OpenAI vision) → Wait → Message a model (OpenAI chat) → **Aggregate2**
- Uso: extrai estrutura do arquivo Figma e analisa imagens frame-a-frame via OpenAI vision.
- **Output shape** (Aggregate2):
  ```json
  {
    "data": [
      {
        "message": {
          "role": "assistant",
          "content": "<texto da análise OpenAI do frame>"
        },
        ...metadados OpenAI (id, model, usage)
      },
      ... (um item por frame analisado)
    ]
  }
  ```

### `google` (usado para slides e reuniao)
- Fluxo: Copy file (GDrive) → Download file → Upload Mistral (OCR) → Signed URL → OCR Retry → Split Out → "Unindo Image Annotation's com Markdown" (code) → **Aggregate3**
- Uso: OCR via Mistral para PDFs/imagens salvos no Google Drive.
- **Output shape** (Aggregate3):
  ```json
  {
    "data": [
      {
        "markdown": "<conteúdo OCR consolidado em markdown>",
        "imagens_anexas": [...],
        ...
      }
    ]
  }
  ```
- ⚠️ Se o URL for um Google Slides direto (não export PDF), o fluxo pode falhar na etapa "Copy file".

### `miro`
- Fluxo: Set variáveis → Extrair Board ID do Link → Buscar Info do Board → Buscar Items → Merge → Processar Dados Miro → Code in JavaScript2 → **Aggregate5**
- Uso: Miro REST API v2 com token hardcoded — lista board + items + estrutura.
- **Output shape** (Aggregate5):
  ```json
  {
    "data": [
      {
        "board_id": "string",
        "board_name": "string",
        "items": [
          { "id": "...", "type": "sticky_note|shape|...", "content": "..." }
        ]
      }
    ]
  }
  ```

### `transcricao`
- Fluxo: **Get a document** (Google Docs API nativo do n8n) → **Aggregate6**
- Uso: leitura direta do conteúdo do doc via API.
- **Output shape** (Aggregate6):
  ```json
  {
    "data": [
      {
        "body": {
          "content": [
            { "paragraph": { "elements": [ { "textRun": { "content": "..." } } ] } },
            ...
          ]
        },
        "title": "string",
        ...metadados do Google Docs
      }
    ]
  }
  ```
- Este é o shape mais estruturado — para extrair texto puro, concatenar `paragraph.elements[].textRun.content`.

### `slides` (atualmente NÃO SUPORTADO diretamente)
Sem branch próprio. Deve ser mapeado para `google` no backend. A mesma observação vale: se o URL é um Google Slides "/edit", o fluxo precisa conseguir exportar para PDF antes do OCR.

### `reuniao` (gravações de vídeo — NÃO SUPORTADO)
Sem branch próprio e nenhum node de transcrição de áudio no workflow. Opções:
1. Mapear para `google` — só funciona se o link for uma transcrição escrita (não vídeo).
2. Ignorar `reuniao` no backend até o workflow ganhar suporte a áudio.
3. Adicionar etapa n8n que chame Whisper antes do OCR.

---

## Edge cases observados

1. **URL inválida/privada** → fluxos Google Drive e Figma retornam erros HTTP capturados por "Wait" ou fazem retry; erro eventualmente aparece no output da Aggregate.
2. **OCR falha no Mistral** → "OCR Retry" node tenta 3x; se todas falharem, o aggregate recebe um item com `error` ao invés de `markdown`.
3. **Token Miro expirado** → node "Buscar Info do Board" retorna 401 — Aggregate5 termina com item vazio.

---

## Recomendação de validação no backend

### Mapeamento correto de `platform` → `plataform` do workflow

```js
// server/services/tc-analyzer.js
const PLATFORM_TO_N8N = {
  slides: 'google',
  reuniao: 'google',       // só funciona se URL for doc/PDF
  transcricao: 'transcricao',
  figma: 'figma',
  miro: 'miro'
}

async function extractViaN8n(url, platform) {
  const n8nPlatform = PLATFORM_TO_N8N[platform]
  if (!n8nPlatform) throw new Error(`platform nao suportada: ${platform}`)
  // ...
  body: JSON.stringify({ url, plataform: n8nPlatform })  // NOTE: "plataform" (typo no workflow)
}
```

### Validação defensiva do retorno

Todos os terminais retornam `{ data: [...] }`. Validar `Array.isArray(response.data) && response.data.length > 0`. Caso contrário, tratar como `{ error: 'empty_response' }` no backend.

### Correção ideal no workflow (futuro)

1. Renomear `plataform` → `platform` em todos os nós (ou vice-versa no backend — mas preferir padrão inglês).
2. Adicionar branch explícita para `slides` e `reuniao`.
3. Mover `miro_token` para credential.
4. Para `reuniao`: adicionar etapa Whisper/AssemblyAI se URL for mídia.

---

## Fontes

- `get_workflow_details` do workflow `uiUUXegcBHe3z2fg` (48 nodes).
- Análise direta de parâmetros dos nós Switch, Setup, Aggregate*, Dados, Configuração-Variáveis e connections map.
- Código backend: `server/services/tc-analyzer.js` (função `extractViaN8n`) e `server/services/kommo-client.js` (`extractPhaseLinks`).
