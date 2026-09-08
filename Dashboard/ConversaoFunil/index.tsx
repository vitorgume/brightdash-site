import { Fragment, useEffect, useMemo, useState } from 'react';
import { Filter, Loader2, Layers, TrendingDown, AlertTriangle, ChevronDown, ChevronUp, Users, XCircle, Ban } from 'lucide-react';
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { TooltipContentProps } from 'recharts';

import { ConversaoFunilService } from '../../../../data/services/ConversaoFunilService';
import { type FunilConversao, type FaseFunilConversao } from '../../../../domain/models/FunilConversao';
import { type MotivoPerdaDto } from '../../../../domain/models/DadosPreVendasOperacional';
import { useAuth } from '../../../context/AuthContext';
import { ApresentacaoShell } from '../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../components/apresentacao/BotaoApresentacao';
import { type SlideApresentacao } from '../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../hooks/useModoApresentacao';
import { mensagemDeErro } from '../../../../infrastructure/api/ApiError';

/**
 * O backend já está pronto (GET /v1/funis/{idEmpresa}/conversao, consumido por
 * ConversaoFunilService.getConversao) mas a estrutura de conversão só existe para empresas
 * ressincronizadas depois do fluxo entrar no ar. Para não travar a validação de design nesse
 * meio-tempo, a tela nasce mockada. Trocar para `false` liga a integração real sem tocar em
 * mais nada — a chamada abaixo já está com o contrato de resposta certo.
 */
const USE_MOCK_DATA = false;

const MOCK_DATA: FunilConversao[] = [
  {
    idFunilCrm: '1',
    nomeFunilCrm: 'Funil de Vendas',
    fases: [
      {
        idFaseCrm: '101',
        nomeFaseCrm: 'Lead',
        negociosAtivos: [
          { idNegocioCrm: 'd1', nomeNegocio: 'Metalúrgica Andrade' },
          { idNegocioCrm: 'd2', nomeNegocio: 'Grupo Vitalis Saúde' },
          { idNegocioCrm: 'd3', nomeNegocio: 'Construtora Horizonte' },
          { idNegocioCrm: 'd4', nomeNegocio: 'Padaria Bom Trigo' },
          { idNegocioCrm: 'd5', nomeNegocio: 'Auto Peças Rota 12' },
          { idNegocioCrm: 'd6', nomeNegocio: 'Contabil Fortaleza' },
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
          { idNegocioCrm: 'd8', nomeNegocio: 'Distribuidora Nordeste' },
          { idNegocioCrm: 'd9', nomeNegocio: 'Studio Criativo MZ' },
          { idNegocioCrm: 'd10', nomeNegocio: 'Farmácia Vida Plena' },
          { idNegocioCrm: 'd11', nomeNegocio: 'Cooperativa Agroleite' },
          { idNegocioCrm: 'd12', nomeNegocio: 'Imobiliária Litoral' },
          { idNegocioCrm: 'd13', nomeNegocio: 'Escritório Pinheiro Advogados' },
          { idNegocioCrm: 'd14', nomeNegocio: 'Rede Fitness Ativa' },
          { idNegocioCrm: 'd15', nomeNegocio: 'Logística Trevo' },
          { idNegocioCrm: 'd16', nomeNegocio: 'Editora Nova Página' },
          { idNegocioCrm: 'd17', nomeNegocio: 'Consultoria Prisma' },
          { idNegocioCrm: 'd18', nomeNegocio: 'Móveis Cedro' },
          { idNegocioCrm: 'd19', nomeNegocio: 'Grupo Serra Azul' },
          { idNegocioCrm: 'd20', nomeNegocio: 'Hotel Vista Mar' },
        ],
        motivosPerda: [
          { nome: 'Sem perfil', quantidade: 4 },
          { nome: 'Não respondeu contato', quantidade: 3 },
          { nome: 'Motivo não informado', quantidade: 1 },
        ],
      },
      {
        idFaseCrm: '102',
        nomeFaseCrm: 'Qualificação',
        negociosAtivos: [
          { idNegocioCrm: 'd1', nomeNegocio: 'Metalúrgica Andrade' },
          { idNegocioCrm: 'd2', nomeNegocio: 'Grupo Vitalis Saúde' },
          { idNegocioCrm: 'd4', nomeNegocio: 'Padaria Bom Trigo' },
          { idNegocioCrm: 'd6', nomeNegocio: 'Contabil Fortaleza' },
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
          { idNegocioCrm: 'd9', nomeNegocio: 'Studio Criativo MZ' },
          { idNegocioCrm: 'd11', nomeNegocio: 'Cooperativa Agroleite' },
          { idNegocioCrm: 'd13', nomeNegocio: 'Escritório Pinheiro Advogados' },
          { idNegocioCrm: 'd15', nomeNegocio: 'Logística Trevo' },
          { idNegocioCrm: 'd17', nomeNegocio: 'Consultoria Prisma' },
          { idNegocioCrm: 'd19', nomeNegocio: 'Grupo Serra Azul' },
        ],
        motivosPerda: [
          { nome: 'Sem orçamento', quantidade: 3 },
          { nome: 'Não é o decisor', quantidade: 1 },
        ],
      },
      {
        idFaseCrm: '103',
        nomeFaseCrm: 'Reunião Agendada',
        negociosAtivos: [
          { idNegocioCrm: 'd1', nomeNegocio: 'Metalúrgica Andrade' },
          { idNegocioCrm: 'd4', nomeNegocio: 'Padaria Bom Trigo' },
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
          { idNegocioCrm: 'd9', nomeNegocio: 'Studio Criativo MZ' },
          { idNegocioCrm: 'd13', nomeNegocio: 'Escritório Pinheiro Advogados' },
          { idNegocioCrm: 'd17', nomeNegocio: 'Consultoria Prisma' },
        ],
        motivosPerda: [
          { nome: 'Não compareceu à reunião', quantidade: 2 },
        ],
      },
      {
        idFaseCrm: '104',
        nomeFaseCrm: 'Proposta Enviada',
        negociosAtivos: [
          { idNegocioCrm: 'd1', nomeNegocio: 'Metalúrgica Andrade' },
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
          { idNegocioCrm: 'd9', nomeNegocio: 'Studio Criativo MZ' },
          { idNegocioCrm: 'd17', nomeNegocio: 'Consultoria Prisma' },
        ],
        motivosPerda: [
          { nome: 'Preço acima do orçamento', quantidade: 2 },
        ],
      },
      {
        idFaseCrm: '105',
        nomeFaseCrm: 'Negociação',
        negociosAtivos: [
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
          { idNegocioCrm: 'd17', nomeNegocio: 'Consultoria Prisma' },
        ],
        motivosPerda: [
          { nome: 'Escolheu concorrente', quantidade: 1 },
        ],
      },
      {
        idFaseCrm: '106',
        nomeFaseCrm: 'Fechamento',
        negociosAtivos: [
          { idNegocioCrm: 'd7', nomeNegocio: 'Tech Solutions BR' },
        ],
        motivosPerda: [],
      },
    ],
  },
  {
    idFunilCrm: '2',
    nomeFunilCrm: 'Funil Pré-Vendas',
    fases: [
      {
        idFaseCrm: '201',
        nomeFaseCrm: 'Cadastro',
        negociosAtivos: [
          { idNegocioCrm: 'p1', nomeNegocio: 'Óptica Bela Vista' },
          { idNegocioCrm: 'p2', nomeNegocio: 'Restaurante Sabor Caseiro' },
          { idNegocioCrm: 'p3', nomeNegocio: 'Clínica OdontoSorriso' },
          { idNegocioCrm: 'p4', nomeNegocio: 'Pet Shop Amigo Fiel' },
          { idNegocioCrm: 'p5', nomeNegocio: 'Barbearia Estilo Urbano' },
          { idNegocioCrm: 'p6', nomeNegocio: 'Academia Corpo em Forma' },
          { idNegocioCrm: 'p7', nomeNegocio: 'Escola Idiomas Global' },
          { idNegocioCrm: 'p8', nomeNegocio: 'Papelaria Criativa' },
        ],
        motivosPerda: [
          { nome: 'Telefone inválido', quantidade: 2 },
          { nome: 'Sem perfil', quantidade: 1 },
        ],
      },
      {
        idFaseCrm: '202',
        nomeFaseCrm: 'Cadência',
        negociosAtivos: [
          { idNegocioCrm: 'p1', nomeNegocio: 'Óptica Bela Vista' },
          { idNegocioCrm: 'p3', nomeNegocio: 'Clínica OdontoSorriso' },
          { idNegocioCrm: 'p4', nomeNegocio: 'Pet Shop Amigo Fiel' },
          { idNegocioCrm: 'p6', nomeNegocio: 'Academia Corpo em Forma' },
          { idNegocioCrm: 'p8', nomeNegocio: 'Papelaria Criativa' },
        ],
        motivosPerda: [
          { nome: 'Não respondeu contato', quantidade: 2 },
          { nome: 'Sem interesse', quantidade: 1 },
        ],
      },
      {
        idFaseCrm: '203',
        nomeFaseCrm: 'Reunião Agendada',
        negociosAtivos: [
          { idNegocioCrm: 'p3', nomeNegocio: 'Clínica OdontoSorriso' },
          { idNegocioCrm: 'p6', nomeNegocio: 'Academia Corpo em Forma' },
        ],
        motivosPerda: [
          { nome: 'Não compareceu à reunião', quantidade: 1 },
        ],
      },
    ],
  },
];

const CORES_FASES = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

/**
 * Perda é uma série única, não uma categoria por motivo: a quantidade de motivos distintos é
 * definida pelo CRM do cliente e não tem teto, e paleta categórica não pode ser gerada/ciclada.
 * O motivo é identificado por rótulo direto, a cor só carrega a semântica de perda (rose-500).
 */
const COR_PERDA = '#f43f5e';

interface FaseComConversao extends FaseFunilConversao {
  conversao: number | null;
  perdas: number;
}

const somarPerdas = (motivosPerda: MotivoPerdaDto[] | undefined) =>
  (motivosPerda ?? []).reduce((acc, motivo) => acc + motivo.quantidade, 0);

const ordenarPorQuantidade = (motivos: MotivoPerdaDto[]) =>
  [...motivos].sort((a, b) => b.quantidade - a.quantidade);

const corConversao = (conversao: number | null) => {
  if (conversao === null) return 'bg-slate-100 text-slate-500';
  if (conversao >= 0.5) return 'bg-emerald-50 text-emerald-700';
  if (conversao >= 0.25) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
};

const formatPercent = (value: number) => `${(value * 100).toFixed(0)}%`;

interface ResumoCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'teal' | 'emerald' | 'rose';
}

const ResumoCard: React.FC<ResumoCardProps> = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className={`p-2 rounded-lg ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className="text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

export default function ConversaoFunilDashboard() {
  const { user } = useAuth();
  const [funis, setFunis] = useState<FunilConversao[]>([]);
  const [idFunilSelecionado, setIdFunilSelecionado] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fasesExpandidas, setFasesExpandidas] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchConversao = async () => {
      setLoading(true);
      setError(null);

      try {
        let resultado: FunilConversao[];

        if (USE_MOCK_DATA) {
          resultado = MOCK_DATA;
        } else {
          if (!user?.empresaId) return;
          resultado = await ConversaoFunilService.getConversao(user.empresaId);
        }

        setFunis(resultado);
        if (resultado.length > 0) {
          setIdFunilSelecionado(resultado[0].idFunilCrm);
        }
      } catch (err) {
        setError(mensagemDeErro(err, 'Não foi possível carregar a conversão de funil.'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversao();
  }, [user]);

  const funilSelecionado = useMemo(
    () => funis.find(f => f.idFunilCrm === idFunilSelecionado) ?? null,
    [funis, idFunilSelecionado]
  );

  // O percentual de conversão entre fases é calculado aqui: o backend só entrega a estrutura
  // do funil e os negócios ativos de cada fase, quem faz a conta é o fe.
  const fasesComConversao = useMemo<FaseComConversao[]>(() => {
    if (!funilSelecionado) return [];

    return funilSelecionado.fases.map((fase, index) => {
      const anterior = index > 0 ? funilSelecionado.fases[index - 1] : null;
      const quantidadeAnterior = anterior?.negociosAtivos.length ?? null;
      const quantidade = fase.negociosAtivos.length;

      const conversao = quantidadeAnterior !== null && quantidadeAnterior > 0
        ? quantidade / quantidadeAnterior
        : index === 0 ? null : (quantidade > 0 ? 0 : null);

      return { ...fase, conversao, perdas: somarPerdas(fase.motivosPerda) };
    });
  }, [funilSelecionado]);

  const dadosPerdasPorFase = useMemo(
    () => fasesComConversao.map(fase => ({
      name: fase.nomeFaseCrm,
      perdas: fase.perdas,
      principalMotivo: ordenarPorQuantidade(fase.motivosPerda ?? [])[0]?.nome ?? null,
    })),
    [fasesComConversao]
  );

  // Consolida os motivos das várias fases num ranking único do funil: o mesmo motivo aparece em
  // fases diferentes e precisa somar, senão "Sem perfil" no Lead e na Qualificação viram dois
  // itens concorrendo no mesmo ranking.
  const motivosConsolidados = useMemo<MotivoPerdaDto[]>(() => {
    const totalPorMotivo = new Map<string, number>();

    fasesComConversao.forEach(fase => {
      (fase.motivosPerda ?? []).forEach(motivo => {
        totalPorMotivo.set(motivo.nome, (totalPorMotivo.get(motivo.nome) ?? 0) + motivo.quantidade);
      });
    });

    return ordenarPorQuantidade(
      Array.from(totalPorMotivo, ([nome, quantidade]) => ({ nome, quantidade }))
    );
  }, [fasesComConversao]);

  const totalPerdas = useMemo(
    () => fasesComConversao.reduce((acc, fase) => acc + fase.perdas, 0),
    [fasesComConversao]
  );

  const dadosFunnelChart = useMemo(
    () => fasesComConversao.map((fase, index) => ({
      name: fase.nomeFaseCrm,
      value: fase.negociosAtivos.length,
      fill: CORES_FASES[index % CORES_FASES.length],
    })),
    [fasesComConversao]
  );

  const resumo = useMemo(() => {
    if (fasesComConversao.length === 0) return null;

    const topoFunil = fasesComConversao[0].negociosAtivos.length;
    const totalAtivo = fasesComConversao.reduce((acc, fase) => acc + fase.negociosAtivos.length, 0);
    const ultimaFase = fasesComConversao[fasesComConversao.length - 1];
    const conversaoGeral = topoFunil > 0 ? ultimaFase.negociosAtivos.length / topoFunil : 0;

    const maiorGargalo = fasesComConversao
      .slice(1)
      .reduce<FaseComConversao | null>((pior, fase) => {
        if (fase.conversao === null) return pior;
        if (!pior || fase.conversao < (pior.conversao ?? 1)) return fase;
        return pior;
      }, null);

    return { topoFunil, totalAtivo, conversaoGeral, maiorGargalo };
  }, [fasesComConversao]);

  const alternarExpansao = (idFaseCrm: string) => {
    setFasesExpandidas(prev => {
      const novo = new Set(prev);
      if (novo.has(idFaseCrm)) {
        novo.delete(idFaseCrm);
      } else {
        novo.add(idFaseCrm);
      }
      return novo;
    });
  };

  const CustomTooltip = ({ active, payload }: TooltipContentProps) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-900">{item.payload.name}</p>
          <p className="text-xs text-slate-500">{item.value} negócios ativos</p>
        </div>
      );
    }
    return null;
  };

  const TooltipPerdas = ({ active, payload }: TooltipContentProps) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const principalMotivo = item.payload.principalMotivo as string | null;

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="text-sm font-medium text-slate-900">{item.payload.name}</p>
          <p className="text-xs text-slate-500">{item.value} negócios perdidos</p>
          {principalMotivo && (
            <p className="text-xs text-slate-500 mt-1">Principal motivo: {principalMotivo}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // As seções vivem aqui uma única vez e alimentam os dois modos: empilhadas na página e,
  // no modo apresentação, uma por slide em tela cheia.
  const slides: SlideApresentacao[] = [
    {
      id: 'resumo',
      titulo: 'Resumo da Conversão',
      descricao: 'Volume no topo do funil, negócios ativos, perdas e o maior gargalo da operação.',
      conteudo: (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <ResumoCard title="Topo do Funil" value={resumo?.topoFunil.toString() ?? '0'} icon={Users} color="teal" />
          <ResumoCard title="Negócios Ativos (todas as fases)" value={resumo?.totalAtivo.toString() ?? '0'} icon={Layers} color="teal" />
          <ResumoCard title="Conversão Geral" value={formatPercent(resumo?.conversaoGeral ?? 0)} icon={TrendingDown} color="emerald" />
          <ResumoCard
            title="Maior Gargalo"
            value={resumo?.maiorGargalo ? `${resumo.maiorGargalo.nomeFaseCrm} (${formatPercent(resumo.maiorGargalo.conversao ?? 0)})` : '—'}
            icon={AlertTriangle}
            color="rose"
          />
          <ResumoCard title="Negócios Perdidos" value={totalPerdas.toString()} icon={XCircle} color="rose" />
          <ResumoCard
            title="Principal Motivo de Perda"
            value={motivosConsolidados[0] ? `${motivosConsolidados[0].nome} (${motivosConsolidados[0].quantidade})` : '—'}
            icon={Ban}
            color="rose"
          />
        </section>
      ),
    },
    {
      id: 'funil-fases',
      titulo: 'Funil e Fases',
      descricao: 'Negócios ativos por fase e a conversão em relação à fase anterior.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Funil de Conversão</h2>
              <p className="text-sm text-slate-500">Negócios ativos por fase.</p>
            </div>
            <div className="h-[320px] group-data-[apresentacao]/slide:h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                  <Tooltip content={CustomTooltip} />
                  <Funnel dataKey="value" data={dadosFunnelChart} isAnimationActive>
                    <LabelList position="right" fill="#334155" stroke="none" dataKey="name" fontSize={12} />
                    {dadosFunnelChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fases do Funil</h2>
              <p className="text-sm text-slate-500">Quantidade, conversão em relação à fase anterior, negócios ativos e motivos de perda.</p>
            </div>

            <div className="flex flex-col divide-y divide-slate-100">
              {fasesComConversao.map((fase, index) => {
                const expandida = fasesExpandidas.has(fase.idFaseCrm);

                return (
                  <div key={fase.idFaseCrm} className="py-4">
                    <button
                      className="w-full flex items-center justify-between gap-4 text-left"
                      onClick={() => alternarExpansao(fase.idFaseCrm)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center justify-center w-7 h-7 group-data-[apresentacao]/slide:w-10 group-data-[apresentacao]/slide:h-10 rounded-full bg-teal-50 text-teal-700 text-xs group-data-[apresentacao]/slide:text-base font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm group-data-[apresentacao]/slide:text-lg font-medium text-slate-900 truncate">{fase.nomeFaseCrm}</p>
                          <p className="text-xs group-data-[apresentacao]/slide:text-sm text-slate-500">
                            {fase.negociosAtivos.length} negócios ativos
                            {fase.perdas > 0 && ` · ${fase.perdas} perdidos`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {fase.perdas > 0 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 group-data-[apresentacao]/slide:px-4 group-data-[apresentacao]/slide:py-1 rounded-full text-xs group-data-[apresentacao]/slide:text-base font-medium bg-rose-50 text-rose-700">
                            <XCircle size={12} className="flex-shrink-0" />
                            {fase.perdas}
                          </span>
                        )}
                        {index > 0 && (
                          <span className={`inline-flex items-center px-2.5 py-0.5 group-data-[apresentacao]/slide:px-4 group-data-[apresentacao]/slide:py-1 rounded-full text-xs group-data-[apresentacao]/slide:text-base font-medium ${corConversao(fase.conversao)}`}>
                            {fase.conversao !== null ? formatPercent(fase.conversao) : '—'}
                          </span>
                        )}
                        {expandida ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                      </div>
                    </button>

                    {expandida && (
                      <div className="mt-3 pl-10 flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <p className="text-xs group-data-[apresentacao]/slide:text-sm font-medium text-slate-500">Negócios ativos</p>
                          <div className="flex flex-wrap gap-2 max-h-48 group-data-[apresentacao]/slide:max-h-72 overflow-y-auto">
                            {fase.negociosAtivos.length === 0 ? (
                              <span className="text-xs text-slate-400">Nenhum negócio ativo nesta fase.</span>
                            ) : (
                              fase.negociosAtivos.map(negocio => (
                                <span
                                  key={negocio.idNegocioCrm}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs group-data-[apresentacao]/slide:text-sm font-medium bg-sky-100 text-sky-800"
                                >
                                  {negocio.nomeNegocio}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <p className="text-xs group-data-[apresentacao]/slide:text-sm font-medium text-slate-500">Motivos de perda</p>
                          <div className="flex flex-wrap gap-2 max-h-48 group-data-[apresentacao]/slide:max-h-72 overflow-y-auto">
                            {fase.perdas === 0 ? (
                              <span className="text-xs text-slate-400">Nenhum negócio perdido nesta fase.</span>
                            ) : (
                              ordenarPorQuantidade(fase.motivosPerda ?? []).map(motivo => (
                                <span
                                  key={motivo.nome}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs group-data-[apresentacao]/slide:text-sm font-medium bg-rose-50 text-rose-700"
                                >
                                  {motivo.nome}
                                  <span className="font-semibold">{motivo.quantidade}</span>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ),
    },
    {
      id: 'motivos-perda',
      titulo: 'Motivos de Perda',
      descricao: 'Onde os negócios morrem no funil e por quê.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Perdas por Fase</h2>
              <p className="text-sm text-slate-500">Negócios perdidos contabilizados na fase em que estavam.</p>
            </div>

            {totalPerdas === 0 ? (
              <div className="flex items-center justify-center h-[280px] text-sm text-slate-400">
                Nenhum negócio perdido registrado neste funil.
              </div>
            ) : (
              <div className="h-[320px] group-data-[apresentacao]/slide:h-[520px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPerdasPorFase} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <Tooltip content={TooltipPerdas} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="perdas" fill={COR_PERDA} radius={[0, 4, 4, 0]} barSize={18} isAnimationActive>
                      <LabelList dataKey="perdas" position="right" fill="#334155" fontSize={12} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Ranking de Motivos</h2>
              <p className="text-sm text-slate-500">Consolidado de todas as fases do funil.</p>
            </div>

            {motivosConsolidados.length === 0 ? (
              <span className="text-sm text-slate-400">Nenhum motivo de perda registrado.</span>
            ) : (
              <div className="flex flex-col gap-4">
                {motivosConsolidados.map(motivo => (
                  <div key={motivo.nome} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm group-data-[apresentacao]/slide:text-base font-medium text-slate-700 truncate">{motivo.nome}</span>
                      <span className="text-sm group-data-[apresentacao]/slide:text-base font-semibold text-slate-900 flex-shrink-0">
                        {motivo.quantidade}
                        <span className="text-slate-500 font-normal ml-1">
                          ({formatPercent(motivo.quantidade / totalPerdas)})
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${(motivo.quantidade / motivosConsolidados[0].quantidade) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ),
    },
  ];

  const apresentacao = useModoApresentacao(slides.length);

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-200/60 mb-6 bg-white shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter size={20} />
          <span className="text-sm font-medium text-slate-600">Conversão de Funil</span>
          {USE_MOCK_DATA && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 ml-2">
              Dados de demonstração
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <BotaoApresentacao onClick={apresentacao.entrar} disabled={loading || !!error || !funilSelecionado} />
          <select
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium"
            value={idFunilSelecionado}
            onChange={(e) => setIdFunilSelecionado(e.target.value)}
          >
            {funis.map(funil => (
              <option key={funil.idFunilCrm} value={funil.idFunilCrm}>{funil.nomeFunilCrm}</option>
            ))}
          </select>
        </div>
      </div>

      <main className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-8 pt-0">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-20">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">Erro</h2>
              <p className="text-slate-500">{error}</p>
            </div>
          </div>
        ) : !funilSelecionado ? (
          <div className="flex items-center justify-center p-20">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">Nenhum funil configurado</h2>
              <p className="text-slate-500">Configure um funil de CRM para acompanhar a conversão.</p>
            </div>
          </div>
        ) : (
          <>
            {slides.map(slide => (
              <Fragment key={slide.id}>{slide.conteudo}</Fragment>
            ))}
          </>
        )}
      </main>

      <ApresentacaoShell
        titulo="Conversão de Funil"
        subtitulo="Fluxo dos negócios entre as fases do pipeline"
        contexto={funilSelecionado?.nomeFunilCrm}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
}
