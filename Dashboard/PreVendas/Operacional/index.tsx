import React, { useEffect, useState, useMemo } from 'react';
import { Target, CalendarDays, TrendingUp, X, Loader2, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

import { MetricasPreVendasService } from '../../../../../data/services/MetricasPreVendasService';
import { MetaService } from '../../../../../data/services/MetaService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosPreVendasOperacional } from '../../../../../domain/models/DadosPreVendasOperacional';
import { type MetaDto } from '../../../../../domain/models/MetaDto';
import { type FunilCrm } from '../../../../../domain/models/Empresa';
import { useAuth } from '../../../../context/AuthContext';

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

interface OperacionalPreVendasProps {
  extraHeaderContent?: React.ReactNode;
}

export default function OperacionalPreVendas({ extraHeaderContent }: OperacionalPreVendasProps) {
  const { user, signOut } = useAuth();
  const [data, setData] = useState<DadosPreVendasOperacional | null>(null);
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
          MetricasPreVendasService.getOperacional(user.id, selectedFunil),
          MetaService.getByUserId(user.id)
        ]);
        setData(resultData);
        setMetas(resultMetas.filter(m => m.metrica?.startsWith('PRE_VENDAS_') ?? false));
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900 mb-2">{label}</p>
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

  const assertividadeAgendaCalc = useMemo(() => {
    if (!data) return 0;
    const agendadas = data.produtividade.reunioesAgendadas || 0;
    const qualificados = data.qualificadoPositivo || 0;
    return agendadas > 0 ? (qualificados / agendadas) * 100 : 0;
  }, [data]);

  const lossReasonData = useMemo(() => {
    if (!data?.motivoPerda) return [];

    // 1. Agrupa e soma as quantidades (elimina repetições do mesmo motivo)
    const grouped: Record<string, number> = {};
    data.motivoPerda.forEach((item: any) => {
      const nome = item.nome || 'Sem motivo';
      grouped[nome] = (grouped[nome] || 0) + Number(item.quantidade || 1);
    });

    // 2. Transforma em array, filtra zerados e ordena do maior para o menor
    let sortedData = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // 3. Regra de Ouro: Top 4 fatias + "Outros"
    if (sortedData.length > 5) {
      const top4 = sortedData.slice(0, 4);
      const othersValue = sortedData.slice(4).reduce((sum, curr) => sum + curr.value, 0);
      sortedData = [...top4, { name: 'Outros', value: othersValue }];
    }

    // 4. Aplica paleta de cores (em degrade para manter a harmonia visual)
    const colors = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#5eead4'];

    return sortedData.map((item, index) => ({
      ...item,
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
      id: 'indicadores',
      titulo: 'Meus Indicadores',
      descricao: 'Qualificação, agendamentos e progresso das minhas metas.',
      conteudo: (
        <section className="flex flex-col xl:flex-row gap-6">
          {/* Bloco de KPIs (Ocupa o espaço flexível) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 flex-1">
            <KpiCard
              title="Qualificados (POSITIVO)"
              value={data?.qualificadoPositivo?.toString() || "0"}
              icon={Target}
              change={0}
              isPositive={true}
              color="emerald"
            />
            <KpiCard
              title="Qualificados (NEGATIVO)"
              value={data?.qualificadoNegativo?.toString() || "0"}
              icon={X}
              change={0}
              isPositive={false}
              color="rose"
            />
            <KpiCard
              title="Reuniões Agendadas"
              value={data?.produtividade?.reunioesAgendadas?.toString() || "0"}
              icon={CalendarDays}
              change={0}
              isPositive={true}
              color="teal"
            />
            <KpiCard
              title="Negócios Perdidos"
              value={data?.negociosPerdidos?.toString() || "0"}
              icon={X}
              change={0}
              isPositive={false}
              color="rose"
            />
            <KpiCard
              title="Assertividade Agenda"
              value={`${assertividadeAgendaCalc.toFixed(1)}%`}
              icon={TrendingUp}
              change={0}
              isPositive={true}
              color="teal"
            />
          </div>

          {/* Bloco de Metas (Garante que fiquem SEMPRE um do lado do outro) */}
          {metas && metas.length > 0 && (
            <div className="flex gap-6 overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
              {metas.map((meta) => (
                <div key={meta.id} className="min-w-[250px] flex-shrink-0">
                  <MetaCard meta={meta} />
                </div>
              ))}
            </div>
          )}
        </section>
      ),
    },
    {
      id: 'desempenho',
      titulo: 'Meu Desempenho',
      descricao: 'Motivos de perda, funil de produtividade e distribuição das minhas atividades.',
      conteudo: (
        <section className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">

          {/* Gráfico 1: Motivos de Perda (Ocupa 1 coluna) */}
          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Meus Motivos de Perda</h2>
              <p className="text-sm text-slate-500">Distribuição das minhas reuniões não convertidas.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[440px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={lossReasonData}
                    cx="50%"
                    cy="45%" /* Subimos o eixo Y levemente para dar espaço embaixo */
                    labelLine={false}
                    outerRadius={75} /* Diminuímos o raio de 80 para 75 */
                    dataKey="value"
                  >
                    {lossReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    verticalAlign="bottom"
                    wrapperStyle={{ fontSize: 11, paddingTop: 10, color: '#64748B' }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Funil de Produtividade (Ocupa 2 colunas para o funil não espremer) */}
          <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Minha Produtividade</h2>
              <p className="text-sm text-slate-500">Acompanhamento do meu funil de conversão mensal.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[440px] flex flex-col items-center justify-end gap-2 relative">
              <div className="w-full flex justify-center">
                <div className="w-full max-w-[400px] group-data-[apresentacao]/slide:max-w-[560px] h-12 group-data-[apresentacao]/slide:h-20 bg-teal-800 rounded flex items-center justify-between px-4 text-white">
                  <span className="font-medium text-sm group-data-[apresentacao]/slide:text-lg">Cadastro</span>
                  <span className="font-bold text-lg group-data-[apresentacao]/slide:text-3xl">{data?.produtividade.quantidadeCadastro || 0}</span>
                </div>
              </div>
              <div className="w-full flex justify-center">
                <div className="w-[80%] max-w-[320px] group-data-[apresentacao]/slide:max-w-[450px] h-12 group-data-[apresentacao]/slide:h-20 bg-teal-700 rounded flex items-center justify-between px-4 text-white">
                  <span className="font-medium text-sm group-data-[apresentacao]/slide:text-lg">Cadência</span>
                  <span className="font-bold text-lg group-data-[apresentacao]/slide:text-3xl">{data?.produtividade.quantidadeCadencia || 0}</span>
                </div>
              </div>
              <div className="w-full flex justify-center">
                <div className="w-[65%] max-w-[260px] group-data-[apresentacao]/slide:max-w-[365px] h-12 group-data-[apresentacao]/slide:h-20 bg-teal-600 rounded flex items-center justify-between px-4 text-white">
                  <span className="font-medium text-sm group-data-[apresentacao]/slide:text-lg">Em Contato</span>
                  <span className="font-bold text-lg group-data-[apresentacao]/slide:text-3xl">{data?.produtividade.quantidadeEmContato || 0}</span>
                </div>
              </div>
              <div className="w-full flex justify-center">
                <div className="w-[50%] max-w-[200px] group-data-[apresentacao]/slide:max-w-[280px] h-12 group-data-[apresentacao]/slide:h-20 bg-teal-500 rounded flex items-center justify-between px-4 text-white">
                  <span className="font-medium text-sm group-data-[apresentacao]/slide:text-lg">Reuniões Agendadas</span>
                  <span className="font-bold text-lg group-data-[apresentacao]/slide:text-3xl">{data?.produtividade.reunioesAgendadas || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 3: Atividades (Ocupa 1 coluna) */}
          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Minhas Atividades</h2>
              <p className="text-sm text-slate-500">Distribuição das tarefas realizadas.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[440px]">
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
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo-svg.svg" alt="Logo" className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Brightdash <span className='text-slate-300 font-normal'>| Pré-Vendas | Meu Painel</span></h1>
              <p className="text-sm text-slate-500">Visão operacional de pré-vendas</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select 
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium"
                value={selectedFunil}
                onChange={(e) => setSelectedFunil(e.target.value)}
            >
              {funis.map(funil => <option key={funil.id_funil_crm} value={funil.id_funil_crm}>{funil.nome_funil_crm}</option>)}
            </select>
            <div className='text-right hidden sm:block'>
              <p className="text-sm font-medium text-slate-900">{user?.name}</p>
              <p className="text-xs text-slate-500">Pré-Vendedor Logado</p>
            </div>
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
            description="Não há dados de pré-vendas para o seu painel no momento."
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
        titulo="Pré-Vendas · Meu Painel"
        subtitulo="Visão operacional individual de pré-vendas"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
};
