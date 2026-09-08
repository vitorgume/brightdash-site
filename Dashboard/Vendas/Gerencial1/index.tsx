import React, { useEffect, useState, useMemo } from 'react';
import { CalendarDays, DollarSign, MoreVertical, XCircle, CheckCircle, Percent, Scale, TrendingUp, Loader2, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

import { MetricasVendasService } from '../../../../../data/services/MetricasVendasService';
import { UsuarioService } from '../../../../../data/services/UsuarioService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosVendasGerencial1 } from '../../../../../domain/models/DadosVendasGerencial1';
import { type Usuario } from '../../../../../domain/models/Usuario';
import { type FunilCrm } from '../../../../../domain/models/Empresa';
import { useAuth } from '../../../../context/AuthContext';
import { MetaCard } from '../../../../components/metrics/MetaCard';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { ApresentacaoShell } from '../../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../../components/apresentacao/BotaoApresentacao';
import { type SlideApresentacao } from '../../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../../hooks/useModoApresentacao';
import { ehRecursoNaoEncontrado, mensagemDeErro } from '../../../../../infrastructure/api/ApiError';

// --- FUNÇÕES AUXILIARES ---
const formatCurrencyDynamic = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(0)}%`;
};

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};

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
      <span className="text-xs text-slate-400">vs. período anterior</span>
    </div>
  </div>
);

export default function Gerencial1VendasDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DadosVendasGerencial1 | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NOVOS ESTADOS DE FILTRO ---
  const [selectedFunil, setSelectedFunil] = useState<string>('');
  const [selectedSdr, setSelectedSdr] = useState<string>('Todos');
  const [dateRange, setDateRange] = useState({
    start: formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: formatDateInput(new Date())
  });
  const [presetLabel, setPresetLabel] = useState<string>('Mês Atual');

  // --- LÓGICA DE DATAS PRÉ-SETADAS ---
  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'ontem':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        setPresetLabel('Ontem');
        break;
      case 'semana_anterior':
        const dayOfWeek = today.getDay();
        start.setDate(today.getDate() - dayOfWeek - 7);
        end.setDate(today.getDate() - dayOfWeek - 1);
        setPresetLabel('Semana Anterior');
        break;
      case 'mes_anterior':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        setPresetLabel('Mês Anterior');
        break;
      case 'trimestre_anterior':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        end = new Date(today.getFullYear(), currentQuarter * 3, 0);
        setPresetLabel('Trimestre Anterior');
        break;
      case 'semestre_anterior':
        start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        setPresetLabel('Semestre Anterior');
        break;
      default: // Mês Atual
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        setPresetLabel('Mês Atual');
    }

    setDateRange({
      start: formatDateInput(start),
      end: formatDateInput(end)
    });
  };

  const mergeGerencial1 = (a: DadosVendasGerencial1, b: DadosVendasGerencial1): DadosVendasGerencial1 => ({
    ...a,
    ...b,
    reunioesRealizadas: [...(a.reunioesRealizadas ?? []), ...(b.reunioesRealizadas ?? [])],
    negociosGanhos: [...(a.negociosGanhos ?? []), ...(b.negociosGanhos ?? [])],
    negocioPerdidos: [...(a.negocioPerdidos ?? []), ...(b.negocioPerdidos ?? [])],
    propostas: [...(a.propostas ?? []), ...(b.propostas ?? [])],
    metas: [...(a.metas ?? []), ...(b.metas ?? [])],
    tarefas: [...(a.tarefas ?? []), ...(b.tarefas ?? [])],
  });

  useEffect(() => {
    const fetchFunnels = async () => {
      if (!user?.empresaId) return;
      setLoading(true);
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
      if (!user?.empresaId || !selectedFunil) return;
      setLoading(true);
      try {
        setError(null);
        const start = parseDateInput(dateRange.start);
        const end = parseDateInput(dateRange.end);
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();

        let resultGerencial: DadosVendasGerencial1;

        if (startYear === endYear) {
          const meses: number[] = [];
          for (let m = start.getMonth() + 1; m <= end.getMonth() + 1; m++) {
            meses.push(m);
          }
          const [result, resultUsuarios] = await Promise.all([
            MetricasVendasService.getGerencial1(user.empresaId, selectedFunil, startYear, meses),
            UsuarioService.getAtivos(user.empresaId),
          ]);
          resultGerencial = result;
          setUsuarios(resultUsuarios);
        } else {
          const mesesAnoInicio: number[] = [];
          for (let m = start.getMonth() + 1; m <= 12; m++) mesesAnoInicio.push(m);

          const mesesAnoFim: number[] = [];
          for (let m = 1; m <= end.getMonth() + 1; m++) mesesAnoFim.push(m);

          const [r1, r2, resultUsuarios] = await Promise.all([
            MetricasVendasService.getGerencial1(user.empresaId, selectedFunil, startYear, mesesAnoInicio),
            MetricasVendasService.getGerencial1(user.empresaId, selectedFunil, endYear, mesesAnoFim),
            UsuarioService.getAtivos(user.empresaId),
          ]);
          resultGerencial = mergeGerencial1(r1, r2);
          setUsuarios(resultUsuarios);
        }

        setData(resultGerencial);
      } catch (err: any) {
        // 404 = não há métricas no período escolhido. Isso não é falha: renderiza o
        // dashboard zerado, mantendo a barra de filtros acessível para trocar o período.
        if (ehRecursoNaoEncontrado(err)) {
          setData(null);
        } else {
          setError(mensagemDeErro(err, 'Não foi possível carregar os dados gerenciais.'));
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, selectedFunil, dateRange]);

  // --- OPÇÕES DE FILTRO (SDRs) ---
  const filterOptions = useMemo(() => {
    if (!data) return { sdrs: [] };

    const sdrs = new Set<string>();
    if (usuarios && usuarios.length > 0) {
      usuarios
        .filter(u => u.tipo_usuario === 'VENDEDOR' || u.tipo_usuario === 'FULLCYCLE')
        .forEach(u => sdrs.add(u.nome));
    } else {
      const extractInfo = (list: any[]) => {
        list.forEach(item => {
          if (item.usuario?.nome) sdrs.add(item.usuario.nome);
        });
      };

      extractInfo(data.reunioesRealizadas);
      extractInfo(data.negociosGanhos);
      extractInfo(data.negocioPerdidos);
      extractInfo(data.propostas);
    }

    return { sdrs: Array.from(sdrs).sort() };
  }, [data, usuarios]);

  useEffect(() => {
    if (selectedSdr !== 'Todos' && !filterOptions.sdrs.includes(selectedSdr)) {
      setSelectedSdr('Todos');
    }
  }, [filterOptions.sdrs, selectedSdr]);

  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  // --- LÓGICA DE FILTRAGEM ATUALIZADA ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const start = parseDateInput(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = parseDateInput(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filterItem = (item: any) => {
      const itemUserName = item?.usuario?.nome;
      let matchesSdr = selectedSdr === 'Todos' || !itemUserName || itemUserName === selectedSdr;
      let matchesDate = false;

      if (item.timestamp) {
        const date = new Date(item.timestamp);
        matchesDate = date >= start && date <= end;
      }

      return matchesSdr && matchesDate;
    };

    let selectedUserId: string | undefined;
    let selectedUserCrmId: string | null | undefined;
    if (selectedSdr !== 'Todos') {
      const userObj = usuarios.find(u => u.nome === selectedSdr);
      selectedUserId = userObj?.id;
      selectedUserCrmId = userObj?.id_usuario_crm;
    }

    const filterTarefa = (item: any) => {
      let matchesDate = false;
      if (item.dataCriacao) {
        const date = new Date(item.dataCriacao);
        matchesDate = date >= start && date <= end;
      }

      if (selectedSdr === 'Todos') return matchesDate;

      const matchesSdr =
        item.idUsuarioCrm === selectedSdr ||
        item.idUsuarioCrm === selectedUserId ||
        item.idUsuarioCrm === selectedUserCrmId ||
        item.usuario?.nome === selectedSdr;

      return matchesDate && matchesSdr;
    };

    return {
      ...data,
      reunioesRealizadas: data.reunioesRealizadas.filter(filterItem),
      negociosGanhos: data.negociosGanhos.filter(filterItem),
      negocioPerdidos: data.negocioPerdidos.filter(filterItem),
      propostas: data.propostas.filter(filterItem),
      tarefas: data.tarefas ? data.tarefas.filter(filterTarefa) : [],
      
      // Lógica de Deduplicação Temporal e Filtro de SDR
      metasFiltradas: (() => {
        if (!data.metas) return [];

        const metasMaisRecentes = new Map();
        const startMonthIndex = start.getFullYear() * 12 + start.getMonth();
        const endMonthIndex = end.getFullYear() * 12 + end.getMonth();

        data.metas.forEach((m: any) => {
          const ref = new Date(m.dataReferencia);
          const refMonthIndex = ref.getFullYear() * 12 + ref.getMonth();

          if (
            refMonthIndex >= startMonthIndex &&
            refMonthIndex <= endMonthIndex &&
            ref <= end
          ) {
            const existente = metasMaisRecentes.get(m.meta.id);
            if (!existente || ref > new Date(existente.dataReferencia)) {
              metasMaisRecentes.set(m.meta.id, m);
            }
          }
        });

        let arrayMetas = Array.from(metasMaisRecentes.values()).map((m: any) => m.meta);

        if (selectedSdr !== 'Todos') {
          arrayMetas = arrayMetas.filter((meta: any) => meta.usuario?.nome === selectedSdr);
        }

        return arrayMetas;
      })()
    };
  }, [data, selectedSdr, dateRange, usuarios]);

  const kpis = useMemo(() => {
    if (!filteredData) return null;
    return {
      reunioes: filteredData.reunioesRealizadas.length,
      ganhosQtd: filteredData.negociosGanhos.length,
      ganhosValor: filteredData.negociosGanhos.reduce((acc, curr) => acc + curr.valor, 0),
      perdidosQtd: filteredData.negocioPerdidos.length,
      perdidosValor: filteredData.negocioPerdidos.reduce((acc, curr) => acc + curr.valor, 0),
    };
  }, [filteredData]);

  const propostasStats = useMemo(() => {
    if (!filteredData) return null;
    const qtd = filteredData.propostas.length;
    const total = filteredData.propostas.reduce((acc, curr) => acc + curr.valor, 0);
    const won = filteredData.negociosGanhos.length;

    return {
      quantidade: qtd,
      totalValue: total,
      ticketMedio: qtd > 0 ? total / qtd : 0,
      conversao: qtd > 0 ? won / qtd : 0
    };
  }, [filteredData]);

  const lossReasonData = useMemo(() => {
    if (!filteredData) return [];

    const counts: Record<string, number> = {};
    filteredData.negocioPerdidos.forEach(item => {
      counts[item.motivoPerda] = (counts[item.motivoPerda] || 0) + 1;
    });

    const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
    return Object.entries(counts).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length]
    }));
  }, [filteredData]);

  const atividadesData = useMemo(() => {
    if (!filteredData?.tarefas) return [];
    const counts: Record<string, number> = {};
    filteredData.tarefas.forEach(t => {
      counts[t.titulo] = (counts[t.titulo] || 0) + 1;
    });

    const maxVal = Math.max(...Object.values(counts), 1);
    const fullMark = Math.ceil(maxVal * 1.2);

    return Object.entries(counts).map(([subject, A]) => ({
      subject,
      A,
      fullMark
    })).sort((a, b) => b.A - a.A);
  }, [filteredData]);


  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
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

  // As seções vivem aqui uma única vez e alimentam os dois modos: empilhadas na página e,
  // no modo apresentação, uma por slide em tela cheia.
  const slides: SlideApresentacao[] = [
    {
      id: 'resultado',
      titulo: 'Resultado Comercial',
      descricao: 'Reuniões, negócios ganhos e perdidos no período selecionado.',
      conteudo: (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <KpiCard title="Reuniões Realizadas" value={kpis?.reunioes.toString() || "0"} icon={CalendarDays} change={0} isPositive={true} color="teal" />
          <KpiCard title="Negócios Ganhos" value={kpis?.ganhosQtd.toString() || "0"} icon={CheckCircle} change={0} isPositive={true} color="emerald" />
          <KpiCard title="Total Ganhos" value={formatCurrencyDynamic(kpis?.ganhosValor || 0)} icon={DollarSign} change={0} isPositive={true} color="emerald" />
          <KpiCard title="Negócios Perdidos" value={kpis?.perdidosQtd.toString() || "0"} icon={XCircle} change={0} isPositive={false} color="rose" />
          <KpiCard title="Total Perdidos" value={formatCurrencyDynamic(kpis?.perdidosValor || 0)} icon={XCircle} change={0} isPositive={false} color="rose" />
        </section>
      ),
    },
    {
      id: 'propostas-perdas',
      titulo: 'Propostas e Motivos de Perda',
      descricao: 'Conversão, ticket médio, metas do time e distribuição das perdas.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {filteredData?.metasFiltradas?.map(meta => (
              <div key={meta.id} className="lg:col-span-2">
                <MetaCard meta={meta} />
              </div>
            ))}
            <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              <KpiCard title="Conversão Ganhou" value={formatPercent(propostasStats?.conversao || 0)} icon={Percent} change={0} isPositive={true} color="teal" />
              <KpiCard title="Total Propostas" value={formatCurrencyDynamic(propostasStats?.totalValue || 0)} icon={DollarSign} change={0} isPositive={true} color="teal" />
              <KpiCard title="Qtd. Propostas" value={propostasStats?.quantidade.toString() || "0"} icon={TrendingUp} change={0} isPositive={true} color="teal" />
              <KpiCard title="Ticket Médio" value={formatCurrencyDynamic(propostasStats?.ticketMedio || 0)} icon={Scale} change={0} isPositive={true} color="teal" />
            </div>
          </div>

          <div className="xl:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Motivos de Perda</h2>
                <p className="text-sm text-slate-500">Distribuição para reuniões agendadas.</p>
              </div>
              <MoreVertical size={18} className="text-slate-400 hover:bg-slate-50 rounded-lg cursor-pointer" />
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
      titulo: 'Atividades da Equipe',
      descricao: 'Distribuição das tarefas realizadas pelo time comercial.',
      conteudo: (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 group-data-[apresentacao]/slide:lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Atividades da Equipe</h2>
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
  const contextoApresentacao = [presetLabel, nomeFunilSelecionado, selectedSdr !== 'Todos' ? selectedSdr : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* TOOLBAR DE FILTROS - DESIGN MODERNO E PADRONIZADO */}
      <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-200/60 mb-6 bg-white shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={20} />
            <span className="text-sm font-medium text-slate-600">Período:</span>
          </div>

          {/* Presets Rápidos */}
          <select
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none"
            onChange={(e) => handlePresetChange(e.target.value)}
            defaultValue=""
          >
            <option value="">Personalizado</option>
            <option value="mes_atual">Mês Atual</option>
            <option value="ontem">Ontem</option>
            <option value="semana_anterior">Semana Anterior</option>
            <option value="mes_anterior">Mês Anterior</option>
            <option value="trimestre_anterior">Trimestre Anterior</option>
            <option value="semestre_anterior">Semestre Anterior</option>
          </select>

          {/* Calendário Manual */}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-teal-500"
              value={dateRange.start}
              onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setPresetLabel('Personalizado'); }}
            />
            <span className="text-slate-400 text-xs font-bold">ATÉ</span>
            <input
              type="date"
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-teal-500"
              value={dateRange.end}
              onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setPresetLabel('Personalizado'); }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium"
            value={selectedFunil}
            onChange={(e) => setSelectedFunil(e.target.value)}
          >
            {funis.map(funil => <option key={funil.id_funil_crm} value={funil.id_funil_crm}>{funil.nome_funil_crm}</option>)}
          </select>

          <select
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium"
            value={selectedSdr}
            onChange={(e) => setSelectedSdr(e.target.value)}
          >
            <option value="Todos">Todos os Vendedores</option>
            {filterOptions.sdrs.map(sdr => <option key={sdr} value={sdr}>{sdr}</option>)}
          </select>

          <BotaoApresentacao onClick={apresentacao.entrar} disabled={loading || !!error || !filteredData} />
          <div className="h-8 w-[1px] bg-slate-200 mx-2" />
          <div className="text-right">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Período</p>
            <p className="text-xs font-semibold text-teal-600">{presetLabel}</p>
          </div>
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
        ) : !filteredData ? (
          <EmptyStateMessage
            title="Nenhum dado disponível"
            description="Não há dados para o período e filtros selecionados."
            subtitle="Tente ajustar o período ou os filtros."
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
        titulo="Vendas · Painel Gerencial"
        subtitulo="Resultado comercial consolidado do time"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
}
