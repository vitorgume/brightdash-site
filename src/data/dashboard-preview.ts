/**
 * Mock data for the illustrative dashboard preview only.
 * Fictitious names and figures — never real customer data.
 *
 * Structure mirrors the real Metriza app screen "Vendas: Gerencial 1/2"
 * (mesmos KPIs, mesmo gráfico de rank de vendedores e mesma pizza de
 * motivos de perda), para que a prévia da landing seja fiel ao produto.
 */

export type KpiColor = 'teal' | 'emerald' | 'rose';

export interface DashboardKpi {
  title: string;
  value: string;
  change: number;
  isPositive: boolean;
  color: KpiColor;
  icon: 'calendar' | 'check' | 'dollar' | 'x';
}

export const dashboardKpis: DashboardKpi[] = [
  { title: 'Reuniões Realizadas', value: '142', change: 12, isPositive: true, color: 'teal', icon: 'calendar' },
  { title: 'Negócios Ganhos', value: '38', change: 8, isPositive: true, color: 'emerald', icon: 'check' },
  { title: 'Total Ganho', value: 'R$ 284.500', change: 8, isPositive: true, color: 'emerald', icon: 'dollar' },
  { title: 'Negócios Perdidos', value: '14', change: 5, isPositive: false, color: 'rose', icon: 'x' },
  { title: 'Total Perdido', value: 'R$ 62.300', change: 5, isPositive: false, color: 'rose', icon: 'x' },
];

export interface RankVendedorPoint {
  name: string;
  quantidade: number;
}

export const rankVendedores: RankVendedorPoint[] = [
  { name: 'Bruna Salgado', quantidade: 14 },
  { name: 'Diego Aquino', quantidade: 11 },
  { name: 'Larissa Prado', quantidade: 9 },
  { name: 'Thiago Nunes', quantidade: 7 },
  { name: 'Yasmin Costa', quantidade: 5 },
];

export interface LossReasonPoint {
  name: string;
  value: number;
  color: string;
}

export const lossReasonData: LossReasonPoint[] = [
  { name: 'Preço', value: 9, color: '#0d9488' },
  { name: 'Sem orçamento', value: 6, color: '#14b8a6' },
  { name: 'Concorrência', value: 4, color: '#2dd4bf' },
  { name: 'Timing', value: 3, color: '#5eead4' },
  { name: 'Sem resposta', value: 2, color: '#99f6e4' },
];
