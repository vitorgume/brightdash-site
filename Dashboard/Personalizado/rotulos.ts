import type {
  AgrupamentoMetrica,
  FonteMetrica,
  LarguraWidget,
  TipoValorMetrica,
  TipoVisualizacao,
} from '../../../../domain/models/DashboardPersonalizado';

export const ROTULOS_VISUALIZACAO: Record<TipoVisualizacao, string> = {
  KPI: 'Número (KPI)',
  GRAFICO_BARRA: 'Gráfico de barras',
  GRAFICO_LINHA: 'Gráfico de linha',
  GRAFICO_AREA: 'Gráfico de área',
  GRAFICO_PIZZA: 'Gráfico de pizza',
  TABELA: 'Tabela',
};

export const ROTULOS_AGRUPAMENTO: Record<AgrupamentoMetrica, string> = {
  NENHUM: 'Sem agrupamento',
  POR_USUARIO: 'Por usuário',
  POR_MES: 'Por mês',
  POR_MOTIVO: 'Por motivo',
  POR_PRODUTO: 'Por produto',
  POR_SEGMENTO: 'Por segmento',
  POR_TIPO: 'Por tipo',
};

export const ROTULOS_FONTE: Record<FonteMetrica, string> = {
  VENDAS_GERENCIAL1: 'Vendas · Gerencial 1',
  VENDAS_GERENCIAL2: 'Vendas · Gerencial 2',
  VENDAS_OPERACIONAL: 'Vendas · Individual',
  PRE_VENDAS_GERENCIAL1: 'Pré-vendas · Gerencial 1',
  PRE_VENDAS_GERENCIAL2: 'Pré-vendas · Gerencial 2',
  PRE_VENDAS_OPERACIONAL: 'Pré-vendas · Individual',
};

/** `colunas` do backend: UM_TERCO=4, METADE=6, DOIS_TERCOS=8, INTEIRA=12. */
export const LARGURAS: Array<{ value: LarguraWidget; label: string; colunas: number }> = [
  { value: 'UM_TERCO', label: 'Um terço da largura', colunas: 4 },
  { value: 'METADE', label: 'Metade da largura', colunas: 6 },
  { value: 'DOIS_TERCOS', label: 'Dois terços da largura', colunas: 8 },
  { value: 'INTEIRA', label: 'Largura inteira', colunas: 12 },
];

/**
 * Classes estáticas porque o Tailwind resolve os nomes em build — interpolar o número de colunas
 * produziria classes ausentes do CSS final. Todo widget ocupa a largura inteira no mobile e só
 * assume a fração escolhida a partir de `md`.
 */
export const CLASSES_LARGURA: Record<LarguraWidget, string> = {
  UM_TERCO: 'col-span-12 md:col-span-6 xl:col-span-4',
  METADE: 'col-span-12 md:col-span-6',
  DOIS_TERCOS: 'col-span-12 xl:col-span-8',
  INTEIRA: 'col-span-12',
};

export function colunasDaLargura(largura: LarguraWidget): number {
  return LARGURAS.find((item) => item.value === largura)?.colunas ?? 6;
}

/** Visualizações que consomem a série; KPI usa só o total. */
export function exigeSerie(visualizacao: TipoVisualizacao): boolean {
  return visualizacao !== 'KPI';
}

export function formatarValor(valor: number | null | undefined, tipo: TipoValorMetrica): string {
  if (valor === null || valor === undefined) return '—';

  if (tipo === 'MONETARIO') {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    });
  }

  if (tipo === 'PERCENTUAL') {
    return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  }

  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

/** Versão curta para eixos de gráfico, onde o valor por extenso não cabe. */
export function formatarValorCompacto(valor: number, tipo: TipoValorMetrica): string {
  if (tipo === 'MONETARIO') {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    });
  }

  if (tipo === 'PERCENTUAL') {
    return `${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
  }

  return valor.toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
}

export const MESES = [
  { valor: 1, label: 'Jan' },
  { valor: 2, label: 'Fev' },
  { valor: 3, label: 'Mar' },
  { valor: 4, label: 'Abr' },
  { valor: 5, label: 'Mai' },
  { valor: 6, label: 'Jun' },
  { valor: 7, label: 'Jul' },
  { valor: 8, label: 'Ago' },
  { valor: 9, label: 'Set' },
  { valor: 10, label: 'Out' },
  { valor: 11, label: 'Nov' },
  { valor: 12, label: 'Dez' },
];

export const PROMPTS_EXEMPLO = [
  {
    rotulo: 'Receita e ticket médio por vendedor',
    prompt: 'Quero acompanhar a receita ganha e o ticket médio por vendedor, com gráfico de barras',
  },
  {
    rotulo: 'Conversão da pré-vendas mês a mês',
    prompt:
      'Mostre a conversão de oportunidade para reunião e a assertividade da agenda da pré-vendas, mês a mês',
  },
  {
    rotulo: 'Motivos de perda no funil de vendas',
    prompt: 'Dashboard com os motivos de perda na proposta e na negociação, em gráfico de pizza',
  },
];
