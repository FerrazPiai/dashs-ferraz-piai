---
title: Upload de PDF arbitrario na Torre de Controle
trigger_condition: Quando aparecer demanda de analisar PDFs que nao sao Google-native (documentos externos enviados por cliente, relatorios de terceiros, etc.)
planted_date: 2026-04-18
---

# Seed: Upload de PDF Arbitrario na Torre de Controle

## Ideia

Alem dos quatro branches atuais (`figma`, `google`, `miro`, `transcricao`),
permitir que o gestor faca upload direto de um PDF no hub para que o mesmo
pipeline de auditoria Saber gere narrativa sobre ele.

Hoje o extrator so aceita URLs. A entrada e:

```json
{ "url": "https://...", "plataform": "figma|google|miro|transcricao" }
```

Seria adicionado um quinto caminho `upload` que aceita multipart/form-data com
um arquivo PDF binario.

## Por que foi plantado agora

Ao decidir eliminar o Mistral OCR do pipeline principal (ver nota
`decisao-internalizacao-extracao-tc.md`), perdemos a capacidade de processar
PDFs que nao sao Google-native. Isso nao afeta o uso atual (100% das URLs vem
do Kommo apontando para Slides/Docs/Figma/Miro), mas bloqueia expansao futura.

## Quando acionar

- Um cliente envia um PDF externo (auditoria de terceiros, relatorio de
  consultoria) e o gestor quer indexar junto com o resto do projeto
- Kommo/CRM passa a suportar anexo de arquivo em vez de so URL
- Usuario pede explicitamente "deixa eu subir o PDF direto"

## Stack proposta (quando implementar)

**Primeiro tenta local (rapido e gratis):**

| Lib | Uso | Quando falha |
|---|---|---|
| `pdf-parse` (Node) | Extracao de camada de texto (99% dos PDFs modernos tem) | PDF escaneado/imagem |
| `pdfjs-dist` (Node) | Fallback com parse mais robusto, extracao de estrutura | PDF complexo com OCR |
| `tesseract.js` (Node) | OCR para paginas que viraram imagem | Qualidade baixa em scans ruins |

**Retry externo (so se local falhar):**

| Servico | Uso |
|---|---|
| Mistral OCR | Reativar `MISTRAL_API_KEY` do `.env` (mantida dormant) — retry quando local falha ou qualidade abaixo de limiar |

**Python nao entra** a menos que qualidade do `tesseract.js` seja inaceitavel
— ai `pymupdf` + `pytesseract` via child-process. Custo: inflar o Docker com
runtime Python.

## Pipeline sugerido

```
upload PDF → pdf-parse primeiro
           → se texto extraido > N chars: OK, manda pro LLM
           → se pouco texto: pdfjs-dist
           → se continua pouco: tesseract.js pagina-a-pagina
           → se ainda falha: retry Mistral OCR
           → se falha tudo: status_avaliacao = incompleta
```

## Referencias

- Research doc: `.planning/research/n8n-workflow-auditoria-saber-interno.md`
  (secao 3 descreve o pipeline Mistral atual que serviria de retry)
- Decisao que criou este seed: `.planning/notes/decisao-internalizacao-extracao-tc.md`
