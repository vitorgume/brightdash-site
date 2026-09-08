export interface Plan {
  name: string;
  description: string;
  highlighted?: boolean;
  features: string[];
}

/**
 * O Brightdash é um software sob medida — não há tabela de preços pública.
 * Estes "perfis" ajudam o visitante a se identificar antes de falar com vendas,
 * mas não representam planos fechados nem valores.
 */
export const plans: Plan[] = [
  {
    name: 'Times em estruturação',
    description: 'Operações comerciais pequenas começando a medir performance de forma estruturada.',
    features: [
      'Ranking de vendedores e SDRs',
      'Metas e progresso da equipe',
      'Integração com 1 CRM',
    ],
  },
  {
    name: 'Times em crescimento',
    description: 'Operações que já precisam de comissionamento e visão de conversão por etapa.',
    highlighted: true,
    features: [
      'Tudo do perfil anterior',
      'Cálculo automático de comissões',
      'Taxas de conversão por etapa',
      'Adoção e uso do CRM',
    ],
  },
  {
    name: 'Operações grandes',
    description: 'Múltiplos times, filiais ou unidades de negócio com processos comerciais distintos.',
    features: [
      'Tudo do perfil anterior',
      'Múltiplos times e filiais',
      'Permissões avançadas por perfil',
      'Onboarding e suporte dedicado',
    ],
  },
];
