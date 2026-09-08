import React, { useEffect, useState, useMemo } from 'react';
import { CalendarDays, TrendingUp, DollarSign, XCircle, CheckCircle, Percent, Scale, Loader2, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

import { MetricasVendasService } from '../../../../../data/services/MetricasVendasService';
import { MetaService } from '../../../../../data/services/MetaService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosVendasOperacional } from '../../../../../domain/models/DadosVendasOperacional';
import { type MetaDto } from '../../../../../domain/models/MetaDto';
import { type FunilCrm } from '../../../../../domain/models/Empresa';
import { useAuth } from '../../../../context/AuthContext';

// --- FUNÇÕES AUXILIARES ---
const formatCurrencyDynamic = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(0)}%`;
};

import { MetaCard } from '../../../../components/metrics/MetaCard';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { ApresentacaoShell } from '../../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../../components/apresentacao/BotaoApresentacao';
import { type SlideApresentacao } from '../../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../../hooks/useModoApresentacao';
import { ehRecursoNaoEncontrado, mensagemDeErro } from '../../../../../infrastructure/api/ApiError';
interface KpiCardProps { title: string; value: string; icon: React.ElementType; change: number; isPositive: boolean; color: string; }
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, change, isPositive, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className={`p-2 rounded-lg ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className={`text-2xl font-semibold ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    <div className="flex items-center gap-2 mt-1">
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        <TrendingUp size={14} className={isPositive ? '' : 'transform rotate-180'} />
        {change}%
      </span>
      <span className="text-xs text-slate-400">vs. mês anterior</span>
    </div>
  </div>
);



interface OperacionalVendasProps {
  extraHeaderContent?: React.ReactNode;
}

export default function OperacionalVendasDashboard({ extraHeaderContent }: OperacionalVendasProps) {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DadosVendasOperacional | null>(null);
  const [metas, setMetas] = useState<MetaDto[]>([]);
  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [selectedFunil, setSelectedFunil] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFunnels = async () => {
      if (!user?.empresaId) return;
      try {
        const empresa = await EmpresaService.getById(user.empresaId);
        const funnels = empresa.configuracao_crm?.funis || [];
        setFunis(funnels);
        if (funnels.length > 0) {
          setSelectedFunil(funnels[0].id_funil_crm);
        } else {
          setLoading(false);
          setError('Nenhum funil configurado para a empresa.');
        }
      } catch (err) {
        setError(mensagemDeErro(err, 'Não foi possível carregar os funis da empresa.'));
        console.error(err);
        setLoading(false);
      }
    };
    fetchFunnels();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !selectedFunil) return;
      setLoading(true);
      try {
        setError(null);
        const [resultData, resultMetas] = await Promise.all([
          MetricasVendasService.getOperacional(user.id, selectedFunil),
          MetaService.getByUserId(user.id)
        ]);
        setData(resultData);
        setMetas(resultMetas.filter(m => m.metrica && m.metrica.startsWith('VENDAS_')));
      } catch (err: any) {
        // 404 = não há métricas no período. Não é falha: renderiza o painel zerado.
        if (ehRecursoNaoEncontrado(err)) {
          setData(null);
        } else {
          setError(mensagemDeErro(err, 'Não foi possível carregar os dados operacionais.'));
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedFunil]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200 hover:">
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm flex items-center gap-2" style={{ color: entry.fill || entry.color }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }}></span>
              {entry.name}: <span className="font-medium text-slate-700"> {entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const lossReasonData = useMemo(() => {
    if (!data?.motivoPerdas) return [];
    const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
    return data.motivoPerdas.map((item, index) => ({
      name: item.nome,
      value: item.quantidade,
      color: colors[index % colors.length]
    }));
  }, [data]);

  const atividadesData = useMemo(() => {
    if (!data?.tarefas) return [];
    const counts: Record<string, number> = {};
    data.tarefas.forEach(t => {
      counts[t.titulo] = (counts[t.titulo] || 0) + 1;
    });
    
    const maxVal = Math.max(...Object.values(counts), 1);
    const fullMark = Math.ceil(maxVal * 1.2); 

    return Object.entries(counts).map(([subject, A]) => ({
      subject,
      A,
      fullMark
    })).sort((a, b) => b.A - a.A);
  }, [data]);

  const handleLogout = () => {
    signOut();
  };

  // As seções vivem aqui uma única vez e alimentam os dois modos: empilhadas na página e,
  // no modo apresentação, uma por slide em tela cheia.
  const slides: SlideApresentacao[] = [
    {
      id: 'resultado',
      titulo: 'Meu Resultado Comercial',
      descricao: 'Reuniões, negócios ganhos e perdidos acumulados no mês.',
      conteudo: (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <KpiCard title="Reuniões Realizadas" value={data?.reunioesRealizadas.toString() || "0"} icon={CalendarDays} change={0} isPositive={true} color="teal" />
          <KpiCard title="Negócios Ganhos" value={data?.negociosGanhos.quantidade.toString() || "0"} icon={CheckCircle} change={0} isPositive={true} color="emerald" />
          <KpiCard title="Total Ganhos" value={formatCurrencyDynamic(data?.negociosGanhos.valorTotal || 0)} icon={DollarSign} change={0} isPositive={true} color="emerald" />
          <KpiCard title="Negócios Perdidos" value={data?.negociosPerdidos.quantidade.toString() || "0"} icon={XCircle} change={0} isPositive={false} color="rose" />
          <KpiCard title="Total Perdidos" value={formatCurrencyDynamic(data?.negociosPerdidos.valorTotal || 0)} icon={XCircle} change={0} isPositive={false} color="rose" />
        </section>
      ),
    },
    {
      id: 'propostas-perdas',
      titulo: 'Minhas Propostas e Perdas',
      descricao: 'Conversão, ticket médio, metas individuais e distribuição das perdas.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Metas */}
            {metas?.map((meta) => (
              <div key={meta.id} className="lg:col-span-2">
                  <MetaCard meta={meta} />
              </div>
            ))}

            {/* Grid de Propostas */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              <KpiCard title="Conversão Ganhou" value={formatPercent(data?.dadoProposta.conversaoGanho || 0)} icon={Percent} change={0} isPositive={true} color="teal" />
              <KpiCard title="Total Propostas" value={formatCurrencyDynamic(data?.dadoProposta.valorTotal || 0)} icon={DollarSign} change={0} isPositive={true} color="teal" />
              <KpiCard title="Qtd. Propostas" value={data?.dadoProposta.quantidade.toString() || "0"} icon={TrendingUp} change={0} isPositive={true} color="teal" />
              <KpiCard title="Ticket Médio" value={formatCurrencyDynamic(data?.dadoProposta.ticketMedio || 0)} icon={Scale} change={0} isPositive={true} color="teal" />
            </div>
          </div>

          {/* Análise de Perdas */}
          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">Meus Motivos de Perda</h2>
                    <p className="text-sm text-slate-500">Distribuição para reuniões agendadas.</p>
                </div>
            </div>

            <div className="h-[300px] min-h-[300px] group-data-[apresentacao]/slide:h-[480px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lossReasonData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {lossReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>
      ),
    },
    {
      id: 'atividades',
      titulo: 'Minhas Atividades',
      descricao: 'Distribuição das tarefas que realizei no período.',
      conteudo: (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gráfico de Atividades (Teia) */}
          <div className="lg:col-span-1 group-data-[apresentacao]/slide:lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Minhas Atividades</h2>
              <p className="text-sm text-slate-500">Distribuição das tarefas realizadas.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={atividadesData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} tick={false} axisLine={false} />
                  <Radar name="Atividades" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      ),
    },
  ];

  const apresentacao = useModoApresentacao(slides.length);
  const nomeFunilSelecionado = funis.find(funil => funil.id_funil_crm === selectedFunil)?.nome_funil_crm;
  const contextoApresentacao = [user?.name, nomeFunilSelecionado].filter(Boolean).join(' · ');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Erro</h2>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo-svg.svg" alt="Logo" className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Brightdash <span className='text-slate-300 font-normal'>| Vendas | Meu Painel</span></h1>
              <p className="text-sm text-slate-500">Métricas acumuladas do mês atual</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className='text-right hidden sm:block'>
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500">Vendedor Logado</p>
            </div>
            <select
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium text-slate-700"
              value={selectedFunil}
              onChange={(e) => setSelectedFunil(e.target.value)}
            >
              {funis.map(funil => <option key={funil.id_funil_crm} value={funil.id_funil_crm}>{funil.nome_funil_crm}</option>)}
            </select>
            <BotaoApresentacao onClick={apresentacao.entrar} disabled={!data} />
            {extraHeaderContent}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-lg font-medium shadow-sm text-sm transition-colors"
              title="Sair"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[100rem] mx-auto p-6 md:p-8 space-y-8">

        {!data ? (
          <EmptyStateMessage
            title="Nenhum dado disponível"
            description="Não há dados de vendas para o seu painel no momento."
            subtitle="Os dados aparecerão assim que você tiver atividade registrada."
          />
        ) : (
          <>
            {slides.map(slide => (
              <React.Fragment key={slide.id}>{slide.conteudo}</React.Fragment>
            ))}
          </>
        )}

      </main>

      <ApresentacaoShell
        titulo="Vendas · Meu Painel"
        subtitulo="Visão operacional individual de vendas"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
};
