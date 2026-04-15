/**
 * Mock data — Torre de Controle
 * Simula a estrutura esperada da API
 */

export const mockData = {
  fases: [
    'Kickoff',
    'Fase 2',
    'Fase 3',
    'Fase 4',
    'Fase 5',
    'Projeto concluído',
  ],
  clientes: [
    {
      nome: 'Elo Vitae',
      squad: 'Squad Alpha',
      coordenador: 'Ana Souza',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'amarelo',
        'Fase 4': 'vermelho',
        'Fase 5': null,
        'Projeto concluído': null,
      },
      detalhes: {
        'Kickoff': {
          score: 9.1,
          analise_materiais: 'Apresentação inicial bem estruturada, cronograma detalhado entregue com antecedência. Materiais visuais de alta qualidade, alinhados com a identidade da marca do cliente.',
          resumo: 'Reunião de alinhamento inicial com sucesso. Foram definidos os objetivos da parceria, expectativas de resultado e principais KPIs a serem monitorados. Cliente demonstrou alto engajamento.',
          insatisfacoes: [],
          oportunidades: [
            { titulo: 'Gestão de Tráfego Pago', descricao: 'Cliente tem orçamento disponível para iniciar campanhas de mídia paga. Interesse explicitado durante a reunião.', valor: 3500 },
          ],
        },
        'Fase 2': {
          score: 8.4,
          analise_materiais: 'Diagnóstico completo entregue dentro do prazo. Análise de concorrência detalhada e mapeamento de oportunidades bem fundamentado.',
          resumo: 'Apresentação do diagnóstico de mercado e posicionamento. Cliente validou todas as hipóteses levantadas. Ajuste no público-alvo primário aprovado.',
          insatisfacoes: [],
          oportunidades: [],
        },
        'Fase 3': {
          score: 6.8,
          analise_materiais: 'Materiais entregues com 2 dias de atraso. Qualidade visual adequada, mas copy precisou de revisões após aprovação inicial.',
          resumo: 'Execução com algumas dificuldades técnicas de integração. Entregáveis no ar ao final da sessão, mas abaixo do planejado em volume.',
          insatisfacoes: [
            'Atraso na entrega dos materiais impactou o cronograma.',
            'Cliente esperava mais proatividade nas comunicações sobre o andamento.',
          ],
          oportunidades: [
            { titulo: 'Produção de Conteúdo Orgânico', descricao: 'Durante a fase, ficou evidente a falta de conteúdo orgânico para suportar as ações pagas.', valor: 1800 },
          ],
        },
        'Fase 4': {
          score: 4.2,
          analise_materiais: 'Relatório de resultados incompleto, sem análise de cohort e sem comparativo com benchmarks do setor.',
          resumo: 'Apresentação dos resultados abaixo da expectativa do cliente. CPL 40% acima do acordado. Foram discutidos ajustes de estratégia e novo prazo para reavaliação.',
          insatisfacoes: [
            'Resultados muito abaixo do prometido no fechamento.',
            'Falta de clareza sobre as causas do underperformance.',
            'Cliente questiona o alinhamento de expectativas feito no Kickoff.',
          ],
          oportunidades: [],
        },
      },
    },
    {
      nome: 'Careca das Capas',
      squad: 'Squad Beta',
      coordenador: 'Pedro Lima',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'verde',
        'Fase 4': 'verde',
        'Fase 5': 'amarelo',
        'Projeto concluído': null,
      },
      detalhes: {
        'Kickoff': {
          score: 9.5,
          analise_materiais: 'Excelente apresentação inicial. Todos os documentos enviados com antecedência. Cliente elogiou a organização da equipe.',
          resumo: 'Kickoff muito bem executado. Cliente extremamente alinhado com a metodologia V4. Metas definidas com clareza e timeline acordado.',
          insatisfacoes: [],
          oportunidades: [],
        },
        'Fase 5': {
          score: 7.1,
          analise_materiais: 'Relatório entregue, mas com visualizações de dados menos elaboradas que os meses anteriores.',
          resumo: 'Reunião com clima mais tenso. Cliente percebe desaceleração nos resultados em relação às fases anteriores. Equipe apresentou plano de aceleração para o próximo ciclo.',
          insatisfacoes: [
            'Sensação de que a equipe perdeu o foco inicial após os primeiros resultados.',
          ],
          oportunidades: [
            { titulo: 'Expansão para E-commerce', descricao: 'Cliente abriu loja virtual e precisa de suporte em estratégia digital para o canal.', valor: 4200 },
            { titulo: 'Branding e Identidade Visual', descricao: 'Marca precisa de atualização visual para suportar o crescimento.', valor: 6000 },
          ],
        },
      },
    },
    {
      nome: 'AGROJR',
      squad: 'Squad Alpha',
      coordenador: 'Ana Souza',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'amarelo',
        'Fase 3': 'vermelho',
        'Fase 4': null,
        'Fase 5': null,
        'Projeto concluído': null,
      },
      detalhes: {
        'Kickoff': {
          score: 8.0,
          analise_materiais: 'Materiais de Kickoff adequados. Apresentação clara dos próximos passos.',
          resumo: 'Kickoff realizado com sucesso. Cliente do setor agro com particularidades de sazonalidade que foram mapeadas.',
          insatisfacoes: [],
          oportunidades: [],
        },
        'Fase 2': {
          score: 6.5,
          analise_materiais: 'Diagnóstico com lacunas na análise do setor agro. Faltou profundidade no mapeamento de concorrentes regionais.',
          resumo: 'Apresentação gerou questionamentos do cliente sobre a profundidade da análise de mercado. Revisão parcial acordada.',
          insatisfacoes: [
            'Cliente sentiu que a equipe não tinha domínio das particularidades do agronegócio.',
          ],
          oportunidades: [],
        },
        'Fase 3': {
          score: 3.1,
          analise_materiais: 'Materiais entregues fora do posicionamento combinado. Necessária reconfecção completa.',
          resumo: 'Fase mal executada. Entregáveis com segmentação incorreta. Cliente ficou insatisfeito e solicitou reunião de urgência com liderança.',
          insatisfacoes: [
            'Segmentação completamente errada.',
            'Materiais não refletiam o setor e o público do cliente.',
            'Falta de validação prévia com o cliente antes de avançar.',
          ],
          oportunidades: [],
        },
      },
    },
    {
      nome: 'Contintas Dourados',
      squad: 'Squad Gamma',
      coordenador: 'Carla Melo',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'verde',
        'Fase 4': 'verde',
        'Fase 5': 'verde',
        'Projeto concluído': 'amarelo',
      },
      detalhes: {
        'Projeto concluído': {
          score: 7.3,
          analise_materiais: 'Proposta de encerramento entregue com dois novos serviços mapeados para continuidade. Análise financeira presente mas conservadora.',
          resumo: 'Reunião de encerramento com cliente aberto a novos produtos. Ficou claro que há budget disponível mas cliente quer ver ROI mais consolidado antes de assinar.',
          insatisfacoes: [
            'Proposta financeira considerada pelo cliente como pouco flexível.',
          ],
          oportunidades: [
            { titulo: 'SEO e Conteúdo', descricao: 'Cliente quer escalar presença orgânica. Interesse em pacote de conteúdo + SEO técnico.', valor: 2800 },
            { titulo: 'Automação de Marketing', descricao: 'Funil de nutrição atual é manual. Oportunidade de implementar ferramenta de automação.', valor: 1500 },
          ],
        },
      },
    },
    {
      nome: 'IA Infinity',
      squad: 'Squad Beta',
      coordenador: 'Pedro Lima',
      fases: {
        'Kickoff': 'amarelo',
        'Fase 2': 'vermelho',
        'Fase 3': null,
        'Fase 4': null,
        'Fase 5': null,
        'Projeto concluído': null,
      },
      detalhes: {
        'Kickoff': {
          score: 6.2,
          analise_materiais: 'Apresentação inicial realizada, mas sem personalização para o setor de tecnologia/IA do cliente.',
          resumo: 'Kickoff com algumas divergências sobre escopo. Cliente tem expectativas muito específicas sobre automações com IA que precisaram ser revisadas.',
          insatisfacoes: [
            'Escopo apresentado não contemplava as especificidades técnicas do negócio.',
          ],
          oportunidades: [],
        },
        'Fase 2': {
          score: 3.8,
          analise_materiais: 'Diagnóstico genérico, sem aderência ao mercado de soluções de IA. Cliente considerou raso.',
          resumo: 'Reunião tensa. Cliente questionou a expertise da equipe em seu segmento. Troca de consultor solicitada. Reunião com liderança agendada.',
          insatisfacoes: [
            'Equipe sem conhecimento do mercado de IA e SaaS B2B.',
            'Análise de concorrentes errada — listou empresas de segmentos diferentes.',
            'Cliente considera cancelamento do contrato.',
          ],
          oportunidades: [],
        },
      },
    },
    {
      nome: 'Ankor Contabilidade',
      squad: 'Squad Alpha',
      coordenador: 'Ana Souza',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'verde',
        'Fase 4': 'verde',
        'Fase 5': 'verde',
        'Projeto concluído': 'verde',
      },
      detalhes: {
        'Projeto concluído': {
          score: 9.8,
          analise_materiais: 'Apresentação de resultados do ciclo completo exemplar. ROI documentado, case de sucesso estruturado e aprovado pelo cliente para uso como referência.',
          resumo: 'Encerramento com upgrade de contrato. Cliente se tornou promotor da V4 e indicou 2 novos clientes durante a reunião. Case de sucesso autorizado para divulgação.',
          insatisfacoes: [],
          oportunidades: [
            { titulo: 'Consultoria Estratégica Trimestral', descricao: 'Cliente quer acesso a sessões de estratégia com sócios da V4. Alto potencial de receita.', valor: 8500 },
            { titulo: 'Treinamento de Equipe Interna', descricao: 'Time de marketing interno do cliente quer capacitação em performance digital.', valor: 12000 },
          ],
        },
      },
    },
    {
      nome: 'Zacharias Soluções',
      squad: 'Squad Gamma',
      coordenador: 'Carla Melo',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'amarelo',
        'Fase 3': 'amarelo',
        'Fase 4': 'vermelho',
        'Fase 5': null,
        'Projeto concluído': null,
      },
      detalhes: {
        'Fase 4': {
          score: 4.5,
          analise_materiais: 'Relatório entregue mas sem análise comparativa com o período anterior à contratação.',
          resumo: 'Resultados abaixo do esperado para o período. Cliente do setor de engenharia demonstrou frustração com o volume de leads gerados. Reunião de replanejamento agendada.',
          insatisfacoes: [
            'Volume de leads muito abaixo do prometido.',
            'Qualidade dos leads gerados considerada baixa.',
          ],
          oportunidades: [],
        },
      },
    },
    {
      nome: 'MUNDIAL MILHAS',
      squad: 'Squad Beta',
      coordenador: 'Pedro Lima',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'verde',
        'Fase 4': 'amarelo',
        'Fase 5': 'amarelo',
        'Projeto concluído': null,
      },
      detalhes: {
        'Fase 5': {
          score: 6.9,
          analise_materiais: 'Relatório completo. Análise de campanhas bem detalhada.',
          resumo: 'Reunião com resultados estáveis mas abaixo do potencial. Cliente no setor de milhas/viagens impactado por sazonalidade. Plano de conteúdo para alta temporada apresentado.',
          insatisfacoes: [
            'Crescimento não está atingindo as metas estabelecidas.',
          ],
          oportunidades: [
            { titulo: 'Influencer Marketing', descricao: 'Setor de viagens tem forte apelo com criadores de conteúdo. Oportunidade de campanha com influenciadores de nicho.', valor: 5000 },
          ],
        },
      },
    },
    {
      nome: 'Matekdata Telecom',
      squad: 'Squad Alpha',
      coordenador: 'Ana Souza',
      fases: {
        'Kickoff': 'vermelho',
        'Fase 2': null,
        'Fase 3': null,
        'Fase 4': null,
        'Fase 5': null,
        'Projeto concluído': null,
      },
      detalhes: {
        'Kickoff': {
          score: 3.5,
          analise_materiais: 'Apresentação inicial com erros de informação sobre o cliente. Dados do briefing incorretos usados na apresentação.',
          resumo: 'Kickoff muito mal executado. Consultor chegou sem ter estudado o cliente. Reunião interrompida pelo cliente após 20 minutos. Escalação para gestão necessária.',
          insatisfacoes: [
            'Consultor claramente despreparado para a reunião.',
            'Dados da empresa apresentados de forma errada.',
            'Cliente ameaçou cancelar contrato antes mesmo de iniciar.',
          ],
          oportunidades: [],
        },
      },
    },
    {
      nome: 'Gvitta',
      squad: 'Squad Gamma',
      coordenador: 'Carla Melo',
      fases: {
        'Kickoff': 'verde',
        'Fase 2': 'verde',
        'Fase 3': 'verde',
        'Fase 4': 'verde',
        'Fase 5': 'verde',
        'Projeto concluído': 'verde',
      },
      detalhes: {
        'Projeto concluído': {
          score: 9.6,
          analise_materiais: 'Apresentação de encerramento exemplar com ROI documentado e case de sucesso aprovado.',
          resumo: 'Projeto concluído com excelência. Cliente satisfeito em todas as frentes. Renovação já assinada para o próximo ciclo com escopo ampliado.',
          insatisfacoes: [],
          oportunidades: [
            { titulo: 'Gestão de Reputação Online', descricao: 'Empresa em crescimento quer monitorar e fortalecer presença em reviews e redes.', valor: 1200 },
          ],
        },
      },
    },
  ],
}
