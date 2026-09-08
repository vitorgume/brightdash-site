import { Trophy, CalendarCheck, Target, Wallet, TrendingUp, Activity } from 'lucide-astro';

export interface Feature {
  icon: typeof Trophy;
  title: string;
  description: string;
}

export const features: Feature[] = [
  {
    icon: Trophy,
    title: 'Ranking de vendedores e SDRs',
    description:
      'Veja quem está performando em tempo real. Rankings automáticos por vendas, atividades e metas batidas sem planilha manual.',
  },
  {
    icon: CalendarCheck,
    title: 'Reuniões agendadas',
    description:
      'Acompanhe quantas reuniões cada pré-vendedor agendou, taxa de comparecimento e conversão para oportunidade.',
  },
  {
    icon: Target,
    title: 'Metas e progresso da equipe',
    description:
      'Metas individuais e coletivas atualizadas ao vivo, com alertas visuais de quem está acima, na média ou abaixo do esperado.',
  },
  {
    icon: Wallet,
    title: 'Comissões automáticas',
    description:
      'Cálculo de comissões direto a partir dos dados do CRM. Chega de reconciliar números no fim do mês.',
  },
  {
    icon: TrendingUp,
    title: 'Taxas de conversão por etapa',
    description:
      'Enxergue gargalos do funil de lead a fechamento com taxas de conversão calculadas automaticamente entre etapas.',
  },
  {
    icon: Activity,
    title: 'Adoção e uso do CRM',
    description:
      'Identifique quem está (ou não) atualizando o CRM corretamente, para ter dados confiáveis e decisões melhores.',
  },
];
