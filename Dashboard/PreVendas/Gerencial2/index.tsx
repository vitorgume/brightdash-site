import { Fragment, useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Loader2, CheckCircle, XCircle, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MetricasPreVendasService } from '../../../../../data/services/MetricasPreVendasService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosPreVendasGerencial2 } from '../../../../../domain/models/DadosPreVendasGerencial2';
import { type FunilCrm } from '../../../../../domain/models/Empresa';
import { useAuth } from '../../../../context/AuthContext';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { ApresentacaoShell } from '../../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../../components/apresentacao/BotaoApresentacao';
import { type SlideApresentacao } from '../../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../../hooks/useModoApresentacao';
import { ehRecursoNaoEncontrado, mensagemDeErro } from '../../../../../infrastructure/api/ApiError';

export default function Gerencial2() {
  const { user } = useAuth();
  const [data, setData] = useState<DadosPreVendasGerencial2 | null>(null);
  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positivos' | 'negativos' | 'perdas'>('positivos');

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

  // --- NOVOS ESTADOS DE PAGINAÇÃO ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // --- NOVOS ESTADOS DE FILTRO ---
  const [selectedFunil, setSelectedFunil] = useState<string>('');
  const [selectedSdr, setSelectedSdr] = useState<string>('Todos');
  const [selectedSegment, setSelectedSegment] = useState<string>('Todos');
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

  const mergeGerencial2 = (a: DadosPreVendasGerencial2, b: DadosPreVendasGerencial2): DadosPreVendasGerencial2 => ({
    ...a,
    ...b,
    motivoPerda: [...(a.motivoPerda ?? []), ...(b.motivoPerda ?? [])],
    negociosQualificadosPositivo: [...(a.negociosQualificadosPositivo ?? []), ...(b.negociosQualificadosPositivo ?? [])],
    negociosQualificadosNegativo: [...(a.negociosQualificadosNegativo ?? []), ...(b.negociosQualificadosNegativo ?? [])],
    vendas: [...(a.vendas ?? []), ...(b.vendas ?? [])],
    rankSegmento: [...(a.rankSegmento ?? []), ...(b.rankSegmento ?? [])],
  });

  // Reseta a página quando os filtros ou aba mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedSdr, selectedSegment, dateRange]);

  useEffect(() => {
    const fetchFunnels = async () => {
      if (!user?.empresaId) return;
      setLoading(true);
      setError(null);
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

        let resultGerencial: DadosPreVendasGerencial2;

        if (startYear === endYear) {
          const meses: number[] = [];
          for (let m = start.getMonth() + 1; m <= end.getMonth() + 1; m++) {
            meses.push(m);
          }
          resultGerencial = await MetricasPreVendasService.getGerencial2(user.empresaId, selectedFunil, startYear, meses);
        } else {
          const mesesAnoInicio: number[] = [];
          for (let m = start.getMonth() + 1; m <= 12; m++) mesesAnoInicio.push(m);

          const mesesAnoFim: number[] = [];
          for (let m = 1; m <= end.getMonth() + 1; m++) mesesAnoFim.push(m);

          const [r1, r2] = await Promise.all([
            MetricasPreVendasService.getGerencial2(user.empresaId, selectedFunil, startYear, mesesAnoInicio),
            MetricasPreVendasService.getGerencial2(user.empresaId, selectedFunil, endYear, mesesAnoFim),
          ]);
          resultGerencial = mergeGerencial2(r1, r2);
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

  // --- OPÇÕES DE FILTRO (SDR e Segmentos) ---
  const filterOptions = useMemo(() => {
    if (!data) return { sdrs: [], segments: [] };

    const sdrs = new Set<string>();
    const segments = new Set<string>();

    const addSdr = (name?: string | null) => {
      if (!name) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      sdrs.add(trimmed);
    };

    // Extrair SDRs de todas as listas que têm o nomeUsuario / usuario.nome
    data.vendas.forEach(v => {
        addSdr(v.nomeUsuario);
        addSdr(v.usuario?.nome);
    });
    data.negociosQualificadosPositivo.forEach(v => {
        addSdr(v.nomeUsuario);
    });
    data.negociosQualificadosNegativo.forEach(v => {
        addSdr(v.nomeUsuario);
    });
    data.motivoPerda.forEach(v => {
        addSdr(v.nomeUsuario);
    });

    const extractSegment = (list: any[]) => {
        list.forEach(item => {
            if (item.segmento) segments.add(item.segmento);
        });
    };

    extractSegment(data.negociosQualificadosPositivo);
    extractSegment(data.negociosQualificadosNegativo);
    data.rankSegmento.forEach(item => {
        if(item.segmento) segments.add(item.segmento);
    });

    return {
        sdrs: Array.from(sdrs).sort(),
        segments: Array.from(segments).sort()
    };
  }, [data]);

  useEffect(() => {
    if (selectedSdr !== 'Todos' && !filterOptions.sdrs.includes(selectedSdr)) {
      setSelectedSdr('Todos');
    }
  }, [filterOptions.sdrs, selectedSdr]);

  useEffect(() => {
    if (selectedSegment !== 'Todos' && !filterOptions.segments.includes(selectedSegment)) {
      setSelectedSegment('Todos');
    }
  }, [filterOptions.segments, selectedSegment]);

  // --- DADOS FILTRADOS (POR RANGE DE DATA E SEGMENTO) ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const start = parseDateInput(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = parseDateInput(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const getSdrName = (item: any): string | null => {
      if (!item) return null;
      if (typeof item.nomeUsuario === 'string' && item.nomeUsuario.trim()) return item.nomeUsuario.trim();
      if (item.usuario && typeof item.usuario.nome === 'string' && item.usuario.nome.trim()) return item.usuario.nome.trim();
      return null;
    };

    const matchesSelectedSdr = (item: any) => {
      if (selectedSdr === 'Todos') return true;
      const name = getSdrName(item);
      if (!name) return true;
      return name === selectedSdr;
    };

    const filterCommon = (item: any) => {
        let matchesSegment = selectedSegment === 'Todos' || (item.segmento && item.segmento === selectedSegment);
        let matchesDate = false;

        if (item.timestamp) {
            const date = new Date(item.timestamp);
            matchesDate = date >= start && date <= end;
        }

        return matchesSegment && matchesDate && matchesSelectedSdr(item);
    };

    return {
        ...data,
        negociosQualificadosPositivo: data.negociosQualificadosPositivo.filter(filterCommon),
        negociosQualificadosNegativo: data.negociosQualificadosNegativo.filter(filterCommon),
        motivoPerda: data.motivoPerda.filter(item => {
             let matchesDate = false;
             if (item.timestamp) {
                const date = new Date(item.timestamp);
                matchesDate = date >= start && date <= end;
             }
             return matchesDate && matchesSelectedSdr(item);
        }),
        vendas: data.vendas.filter(item => {
            let matchesDate = false;
            if (item.timestamp) {
                const date = new Date(item.timestamp);
                matchesDate = date >= start && date <= end;
            }
            return matchesDate && matchesSelectedSdr(item);
        }),
        rankSegmento: data.rankSegmento.filter(filterCommon)
    };
  }, [data, selectedSdr, selectedSegment, dateRange]);

  // --- MAPEAMENTOS ---
  const currentTableData = useMemo(() => {
    if (!filteredData) return [];
    
    switch (activeTab) {
      case 'positivos':
        return filteredData.negociosQualificadosPositivo.map((deal, idx) => ({
          id: idx,
          company: deal.nome,
          segment: deal.segmento,
          stage: 'Qualificado',
          reason: ''
        }));
      case 'negativos':
        return filteredData.negociosQualificadosNegativo.map((deal, idx) => ({
          id: idx,
          company: deal.nome,
          segment: deal.segmento,
          stage: 'Não qualificado',
          reason: 'Não qualificado'
        }));
      case 'perdas':
        return filteredData.motivoPerda.map((deal, idx) => ({
          id: idx,
          company: deal.nomeNegocio,
          segment: '-',
          stage: 'Reunião Agendada',
          reason: deal.motivoPerda
        }));
      default:
        return [];
    }
  }, [filteredData, activeTab]);

  const totalPages = Math.ceil(currentTableData.length / itemsPerPage);
  
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return currentTableData.slice(startIndex, startIndex + itemsPerPage);
  }, [currentTableData, currentPage]);

  const sdrRankData = useMemo(() => {
    if (!filteredData) return [];
    
    const stats: Record<string, { total: number, qualificados: number }> = {};

    // 1. Conta os qualificados POSITIVOS
    filteredData.negociosQualificadosPositivo.forEach(v => {
        const name = v.nomeUsuario || 'Desconhecido';
        if (!stats[name]) stats[name] = { total: 0, qualificados: 0 };
        
        stats[name].qualificados += 1; // Aumenta a barra verde
        stats[name].total += 1;        // Aumenta a barra cinza (Total)
    });

    // 2. Conta os qualificados NEGATIVOS (Apenas para compor o Total de negócios trabalhados)
    filteredData.negociosQualificadosNegativo.forEach(v => {
        const name = v.nomeUsuario || 'Desconhecido';
        if (!stats[name]) stats[name] = { total: 0, qualificados: 0 };
        
        stats[name].total += 1; // Aumenta apenas a barra cinza
    });

    return Object.entries(stats).map(([name, data]) => ({
        name,
        qualificados: data.qualificados,
        total: data.total
    })).sort((a, b) => b.qualificados - a.qualificados);
  }, [filteredData]);

  const segmentRankData = useMemo(() => {
    if (!filteredData) return [];
    
    const stats: Record<string, number> = {};
    filteredData.rankSegmento.forEach(item => {
        if (item.segmento) {
            stats[item.segmento] = (stats[item.segmento] || 0) + 1;
        }
    });
    
    if (Object.keys(stats).length === 0) {
        filteredData.negociosQualificadosPositivo.forEach(d => {
            if(d.segmento) stats[d.segmento] = (stats[d.segmento] || 0) + 1;
        });
    }

    return Object.entries(stats).map(([name, quantidade]) => ({
        name,
        quantidade
    })).sort((a, b) => b.quantidade - a.quantidade);
  }, [filteredData]);


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

  // As seções vivem aqui uma única vez e alimentam os dois modos: empilhadas na página e,
  // no modo apresentação, uma por slide em tela cheia.
  const slides: SlideApresentacao[] = [
    {
      id: 'listagem',
      titulo: 'Listagem de Negócios',
      descricao: 'Acompanhamento detalhado do pipeline de pré-vendas.',
      conteudo: (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Listagem de Negócios</h2>
              <p className="text-sm text-slate-500">Acompanhamento detalhado do pipeline de pré-vendas.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-slate-100">
            <button
              onClick={() => setActiveTab('positivos')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'positivos' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Qualificados Positivos
            </button>
            <button
              onClick={() => setActiveTab('negativos')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'negativos' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Qualificados Negativos
            </button>
            <button
              onClick={() => setActiveTab('perdas')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'perdas' ? 'border-amber-500 text-amber-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Perdas (Reunião Agendada)
            </button>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm group-data-[apresentacao]/slide:text-base text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Segmento</th>
                  <th className="px-6 py-4">{activeTab === 'perdas' ? 'Motivo da Perda' : 'Estágio CRM'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                    paginatedData.map(deal => (
                    <tr key={deal.id} className="bg-white hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{deal.company}</td>
                        <td className="px-6 py-4 text-slate-700">{deal.segment || '-'}</td>
                        <td className="px-6 py-4">
                        {activeTab === 'perdas' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                            <AlertTriangle size={14} className="mr-1"/>
                            {deal.reason}
                            </span>
                        ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                activeTab === 'positivos' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                            {activeTab === 'positivos' ? <CheckCircle size={14} className="mr-1"/> : <XCircle size={14} className="mr-1"/>}
                            {deal.stage}
                            </span>
                        )}
                        </td>
                    </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                            Nenhum dado encontrado para os filtros selecionados.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* CONTROLES DE PAGINAÇÃO */}
          {currentTableData.length > 0 && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                Mostrando <span className="font-medium text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, currentTableData.length)}</span> de <span className="font-medium text-slate-900">{currentTableData.length}</span> resultados
              </span>
              {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </button>
                    <span className="text-sm text-slate-600 px-2 font-medium">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                    >
                      Próxima
                      <ChevronRight size={16} />
                    </button>
                  </div>
              )}
            </div>
          )}
        </section>
      ),
    },
    {
      id: 'rankings',
      titulo: 'Rankings de Pré-Vendas',
      descricao: 'Performance individual dos SDRs e distribuição dos negócios por segmento.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Rank de Pré-vendedores (SDRs)</h2>
              <p className="text-sm text-slate-500">Acompanhamento da performance individual.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sdrRankData} layout="vertical" barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} width={120}/>
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Bar dataKey="total" name="Negócios Totais" fill="#CBD5E1" radius={[0, 4, 4, 0]} maxBarSize={15} />
                  <Bar dataKey="qualificados" name="Qualificados Positivos" fill="#0d9488" radius={[0, 4, 4, 0]} maxBarSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Rank de Segmentos Atendidos</h2>
              <p className="text-sm text-slate-500">Distribuição dos negócios por segmento.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[460px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={segmentRankData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Bar dataKey="quantidade" name="Quantidade" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      ),
    },
  ];

  const apresentacao = useModoApresentacao(slides.length);
  const nomeFunilSelecionado = funis.find(funil => funil.id_funil_crm === selectedFunil)?.nome_funil_crm;
  const contextoApresentacao = [
    presetLabel,
    nomeFunilSelecionado,
    selectedSdr !== 'Todos' ? selectedSdr : null,
    selectedSegment !== 'Todos' ? selectedSegment : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="bg-slate-50 min-h-screen">

      {/* TOOLBAR DE FILTROS */}
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
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium max-w-[200px] truncate"
                value={selectedFunil}
                onChange={(e) => setSelectedFunil(e.target.value)}
            >
              {funis.map(funil => <option key={funil.id_funil_crm} value={funil.id_funil_crm}>{funil.nome_funil_crm}</option>)}
            </select>

            <select 
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium max-w-[200px] truncate"
                value={selectedSdr}
                onChange={(e) => setSelectedSdr(e.target.value)}
            >
              <option value="Todos">Todos os SDRs</option>
              {filterOptions.sdrs.map(sdr => <option key={sdr} value={sdr}>{sdr}</option>)}
            </select>
            
            {/* O Filtro de Segmentos da Tela 2 continua aqui */}
            <select 
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm bg-white shadow-sm font-medium max-w-[200px] truncate"
                value={selectedSegment}
                onChange={(e) => setSelectedSegment(e.target.value)}
            >
              <option value="Todos">Todos os Segmentos</option>
              {filterOptions.segments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
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
          <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 text-teal-600 animate-spin" /></div>
        ) : error ? (
          <div className="p-20 flex items-center justify-center"><div className="text-center"><h2 className="text-lg font-semibold text-slate-900">Erro</h2><p className="text-slate-500">{error}</p></div></div>
        ) : !filteredData ? (
          <EmptyStateMessage
            title="Nenhum dado disponível"
            description="Não há dados para o período e filtros selecionados."
            subtitle="Tente ajustar o período ou os filtros."
          />
        ) : (
          <>
            {slides.map(slide => (
              <Fragment key={slide.id}>{slide.conteudo}</Fragment>
            ))}
          </>
        )}
      </main>

      <ApresentacaoShell
        titulo="Pré-Vendas · Negócios e Rankings"
        subtitulo="Pipeline detalhado e performance da equipe de pré-vendas"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
}
