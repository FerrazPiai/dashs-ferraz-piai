# Research Questions

Perguntas em aberto que precisam de investigacao antes de virarem decisao ou
requerimento. Adicionadas pelo `/gsd-explore` ou manualmente durante planejamento.

---

## Internalizacao do extrator Torre de Controle

**Q1. Ownership do token OAuth em extracoes cruzadas entre gestores**

*Data:* 2026-04-18
*Contexto:* Com OAuth per-user (decisao em `.planning/notes/decisao-internalizacao-extracao-tc.md`),
cada gestor tem seu proprio refresh_token Google armazenado no DB.

*A pergunta:* quando o Gestor A cadastra a URL de um Google Slides no Kommo
(fluxo atual), mas o Gestor B abre a tela da Torre de Controle e dispara a
analise, qual token OAuth o backend deve usar?

*Opcoes candidatas:*

1. **Token do criador (Gestor A)** — Mais intuitivo: foi quem cadastrou, quem
   conhece o projeto, quem provavelmente tem acesso. Risco: Gestor A saiu da
   empresa e revogou o consentimento → extracao falha mesmo com Gestor B ativo.

2. **Token do consumidor (Gestor B)** — Segue o principio "le apenas o que o
   usuario atual pode ler". Risco: Gestor B pode nao ter acesso ao arquivo que
   Gestor A cadastrou → falha 403 mesmo estando conectado.

3. **Cascata: tenta criador, fallback para consumidor** — Mais tolerante. Mais
   complexo. Pode mascarar problemas de compartilhamento.

4. **Token de qualquer usuario com acesso, escolhido automaticamente** — Back-end
   tenta sequencialmente os tokens disponiveis ate um funcionar. Caro (varias
   chamadas 403 ate achar). Risco de ordem imprevisivel em logs.

*O que investigar:*
- Qual e a realidade hoje? Um projeto da V4 e cadastrado por uma pessoa e
  analisado por varias, ou cada gestor so ve os proprios projetos?
- O que o Kommo sabe sobre "dono" de um registro? Da pra correlacionar com o
  user_id do hub?
- Auditoria/LGPD: tem preocupacao em rastrear "quem leu o quê"?

*Quando precisa ser respondida:* antes da fase de planning da internalizacao,
porque impacta schema (tabela `tc_projetos` precisa de `created_by_user_id`?)
e impacta UX de erro.
