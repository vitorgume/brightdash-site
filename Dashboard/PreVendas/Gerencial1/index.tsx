import React, { useEffect, useState, useMemo } from 'react';
import { Target, CalendarDays, TrendingUp, X, Loader2, Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

import { MetricasPreVendasService } from '../../../../../data/services/MetricasPreVendasService';
import { UsuarioService } from '../../../../../data/services/UsuarioService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosPreVendasGerencial1 } from '../../../../../domain/models/DadosPreVendasGerencial1';
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

// --- COMPONENTES AUXILIARES ---
interface KpiCardBadge { label: string; value: string; }
interface KpiCardProps { title: string; value: string; icon: React.ElementType; change: number; isPositive: boolean; color: string; badge?: KpiCardBadge; }
const KpiCard: React.FC<KpiCardProps> = ({ title, value, icon: Icon, change, isPositive, color, badge }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-2">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className={`p-2 rounded-lg ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : color === 'rose' ? 'bg-rose-50 text-rose-600' : 'bg-teal-50 text-teal-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
    <p className={`text-2xl font-semibold ${color === 'emerald' ? 'text-emerald-600' : color === 'rose' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
    <div className={`flex items-center gap-2 mt-1 ${badge ? 'justify-between' : ''}`}>
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
        <TrendingUp size={14} className={isPositive ? '' : 'transform rotate-180'} />
        {change}%
      </span>
      {badge ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-xs font-medium whitespace-nowrap">
          {badge.label} {badge.value}
        </span>
      ) : (
        <span className="text-xs text-slate-400">vs. mês anterior</span>
      )}
    </div>
  </div>
);

export default function Gerencial1() {
  const { user } = useAuth();
  const [data, setData] = useState<DadosPreVendasGerencial1 | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // --- NOVOS ESTADOS DE FILTRO ---
  const [selectedFunil, setSelectedFunil] = useState<string>('');
  const [selectedSdr, setSelectedSdr] = useState<string>('Todos');
  const [dateRange, setDateRange] = useState({
    start: formatDateInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: formatDateInput(new Date())
  });
  const [presetLabel, setPresetPresetLabel] = useState<string>('Mês Atual');

  // Lógica para aplicar datas pré-setadas
  const handlePresetChange = (preset: string) => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'ontem':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        setPresetPresetLabel('Ontem');
        break;
      case 'semana_anterior':
        const dayOfWeek = today.getDay();
        start.setDate(today.getDate() - dayOfWeek - 7);
        end.setDate(today.getDate() - dayOfWeek - 1);
        setPresetPresetLabel('Semana Anterior');
        break;
      case 'mes_anterior':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        setPresetPresetLabel('Mês Anterior');
        break;
      case 'trimestre_anterior':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        start = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        end = new Date(today.getFullYear(), currentQuarter * 3, 0);
        setPresetPresetLabel('Trimestre Anterior');
        break;
      case 'semestre_anterior':
        start = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        setPresetPresetLabel('Semestre Anterior');
        break;
      default: // Mês Atual
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = today;
        setPresetPresetLabel('Mês Atual');
    }

    setDateRange({
      start: formatDateInput(start),
      end: formatDateInput(end)
    });
  };

  // Mescla dois resultados de anos diferentes em um único objeto
  const mergeGerencial1 = (a: DadosPreVendasGerencial1, b: DadosPreVendasGerencial1): DadosPreVendasGerencial1 => ({
    ...a,
    ...b, // metadados (empresa, ultimaAtualizacao) ficam com o mais recente
    oportunidades:        [...(a.oportunidades        ?? []), ...(b.oportunidades        ?? [])],
    reuniosAgendadas:     [...(a.reuniosAgendadas     ?? []), ...(b.reuniosAgendadas     ?? [])],
    qualificadosPositivos:[...(a.qualificadosPositivos?? []), ...(b.qualificadosPositivos?? [])],
    qualificadosNegativo: [...(a.qualificadosNegativo ?? []), ...(b.qualificadosNegativo ?? [])],
    reuniaoRealizada:     [...(a.reuniaoRealizada     ?? []), ...(b.reuniaoRealizada     ?? [])],
    perdidos:             [...(a.perdidos             ?? []), ...(b.perdidos             ?? [])],
    produtividade:        [...(a.produtividade        ?? []), ...(b.produtividade        ?? [])],
    tarefas:              [...(a.tarefas              ?? []), ...(b.tarefas              ?? [])],
    metas:                [...(a.metas               ?? []), ...(b.metas               ?? [])],
  });

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
        const end   = parseDateInput(dateRange.end);
        const startYear = start.getFullYear();
        const endYear   = end.getFullYear();

        let resultGerencial: DadosPreVendasGerencial1;

        if (startYear === endYear) {
          // Período dentro do mesmo ano — uma única chamada
          const meses: number[] = [];
          for (let m = start.getMonth() + 1; m <= end.getMonth() + 1; m++) {
            meses.push(m);
          }
          resultGerencial = await MetricasPreVendasService.getGerencial1(user.empresaId, selectedFunil, startYear, meses);
        } else {
          // Período cross-year — duas chamadas paralelas, depois merge
          const mesesAnoInicio: number[] = [];
          for (let m = start.getMonth() + 1; m <= 12; m++) mesesAnoInicio.push(m);

          const mesesAnoFim: number[] = [];
          for (let m = 1; m <= end.getMonth() + 1; m++) mesesAnoFim.push(m);

          const [r1, r2] = await Promise.all([
            MetricasPreVendasService.getGerencial1(user.empresaId, selectedFunil, startYear, mesesAnoInicio),
            MetricasPreVendasService.getGerencial1(user.empresaId, selectedFunil, endYear,   mesesAnoFim),
          ]);
          resultGerencial = mergeGerencial1(r1, r2);
        }

        const resultUsuarios = await UsuarioService.getAtivos(user.empresaId);
        setData(resultGerencial);
        setUsuarios(resultUsuarios);
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

  const filterOptions = useMemo(() => {
    if (!data) return { sdrs: [] };
    const sdrs = new Set<string>();
    
    if (usuarios && usuarios.length > 0) {
      // Filtra direto da API: apenas pré-vendedores e fullcycle
      usuarios
        .filter(u => u.tipo_usuario === 'PRE_VENDEDOR' || u.tipo_usuario === 'FULLCYCLE')
        .forEach(u => sdrs.add(u.nome));
    } else {
      // Fallback de segurança
      const extractInfo = (list: any[]) => {
        if(list) list.forEach(item => { if (item.usuario?.nome) sdrs.add(item.usuario.nome); });
      };
      extractInfo(data.oportunidades);
      extractInfo(data.reuniosAgendadas);
      extractInfo(data.qualificadosPositivos);
      extractInfo(data.qualificadosNegativo);
      extractInfo(data.reuniaoRealizada);
    }
    
    return { sdrs: Array.from(sdrs).sort() };
  }, [data, usuarios]);

  useEffect(() => {
    if (selectedSdr !== 'Todos' && !filterOptions.sdrs.includes(selectedSdr)) {
      setSelectedSdr('Todos');
    }
  }, [filterOptions.sdrs, selectedSdr]);

  // --- LÓGICA DE FILTRAGEM ATUALIZADA (POR RANGE DE DATA) ---
  // --- LÓGICA DE FILTRAGEM ATUALIZADA (POR RANGE DE DATA E OMNI-FILTER) ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const start = parseDateInput(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = parseDateInput(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filterByDateAndSdr = (item: any, dateField: string = 'timestamp') => {
      const itemUserName = item?.usuario?.nome;
      const matchesSdr = selectedSdr === 'Todos' || !itemUserName || itemUserName === selectedSdr;
      
      const itemDate = new Date(item[dateField]);
      const matchesDate = itemDate >= start && itemDate <= end;

      return matchesSdr && matchesDate;
    };

    // 👇 OMNI-FILTER DE VOLTA À AÇÃO!
    let selectedUserId: string | undefined;
    let selectedUserCrmId: string | null | undefined;

    if (selectedSdr !== 'Todos') {
        const userObj = usuarios.find(u => u.nome === selectedSdr);
        selectedUserId = userObj?.id; // O UUID do nosso sistema
        selectedUserCrmId = userObj?.id_usuario_crm; // ID numérico do CRM
    }

    // Filtro especial para tarefas (que usa idUsuarioCrm em vez de objeto usuario)
    const filterTarefa = (item: any) => {
      const itemDate = new Date(item.dataCriacao);
      const matchesDate = itemDate >= start && itemDate <= end;
      
      if (selectedSdr === 'Todos') return matchesDate;
      
      // A mágica testa todas as opções possíveis!
      const matchesSdr =
          item.idUsuarioCrm === selectedSdr ||           // Caso BomControle/Moskit (Nome)
          item.idUsuarioCrm === selectedUserId ||        // Caso Sistema (UUID)
          item.idUsuarioCrm === selectedUserCrmId ||     // Caso Pipedrive (ID CRM)
          item.usuario?.nome === selectedSdr;            // Fallback de segurança

      return matchesDate && matchesSdr;
    };

    return {
      ...data,
      oportunidades: data.oportunidades.filter(i => filterByDateAndSdr(i)),
      reuniosAgendadas: data.reuniosAgendadas.filter(i => filterByDateAndSdr(i)),
      qualificadosPositivos: data.qualificadosPositivos.filter(i => filterByDateAndSdr(i)),
      qualificadosNegativo: data.qualificadosNegativo.filter(i => filterByDateAndSdr(i)),
      perdidos: data.perdidos.filter(i => filterByDateAndSdr(i)),
      produtividade: data.produtividade.filter(i => filterByDateAndSdr(i)),
      tarefas: data.tarefas ? data.tarefas.filter(filterTarefa) : [],
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
    
    const totalQualificadosPositivos = filteredData.qualificadosPositivos.length;
    const totalQualificadosNegativos = filteredData.qualificadosNegativo.length;
    const totalReunioesAgendadas = filteredData.reuniosAgendadas.length;

    const desqualificadosIdentificados = new Set(
      filteredData.qualificadosNegativo
        .map(negocio => negocio.idNegocioCrm)
        .filter((id): id is string => !!id)
    );

    const desqualificadosSemIdentificacao = filteredData.qualificadosNegativo.filter(
      negocio => !negocio.idNegocioCrm
    ).length;

    const agendadasNaoDesqualificadas = filteredData.reuniosAgendadas.filter(
      reuniao => !reuniao.idNegocioCrm || !desqualificadosIdentificados.has(reuniao.idNegocioCrm)
    ).length;

    const reunioesAgendadasEfetivas = Math.max(
      agendadasNaoDesqualificadas - desqualificadosSemIdentificacao,
      0
    );

    return {
      qualificadosPositivos: totalQualificadosPositivos,
      qualificadosNegativos: totalQualificadosNegativos,
      negociosPerdidos: filteredData.perdidos.length,
      reunioesAgendadas: totalReunioesAgendadas,
      reunioesAgendadasEfetivas,
      assertividadeMedia: totalReunioesAgendadas > 0
        ? (totalQualificadosPositivos / totalReunioesAgendadas) * 100
        : 0
    };
  }, [filteredData]);

  const lossReasonData = useMemo(() => {
    if (!filteredData) return [];
    const counts: Record<string, number> = {};
    filteredData.perdidos.forEach(item => { counts[item.motivoPerda] = (counts[item.motivoPerda] || 0) + 1; });
    const colors = ['#0d9488', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
    return Object.entries(counts).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }));
  }, [filteredData]);

  const funnelData = useMemo(() => {
    if (!filteredData) return { cadastro: 0, cadencia: 0, emContato: 0, reunioes: 0 };
    const cadastro = filteredData.produtividade.filter(p => p.tipoDadoProdutividade === 'CADASTRO').length;
    const cadencia = filteredData.produtividade.filter(p => p.tipoDadoProdutividade === 'CADENCIA').length;
    const emContato = filteredData.produtividade.filter(p => p.tipoDadoProdutividade === 'EM_CONTATO').length;
    const reunioes = filteredData.produtividade.filter(p => p.tipoDadoProdutividade === 'REUNIAO_AGENDADA').length;
    return { cadastro, cadencia, emContato, reunioes };
  }, [filteredData]);

  const atividadesData = useMemo(() => {
    if (!filteredData?.tarefas) return [];
    const counts: Record<string, number> = {};
    filteredData.tarefas.forEach(t => { counts[t.titulo] = (counts[t.titulo] || 0) + 1; });
    const maxVal = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([subject, A]) => ({ subject, A, fullMark: Math.ceil(maxVal * 1.2) })).sort((a, b) => b.A - a.A);
  }, [filteredData]);

  // As seções vivem aqui uma única vez e alimentam os dois modos: empilhadas na página e,
  // no modo apresentação, uma por slide em tela cheia.
  const slides: SlideApresentacao[] = [
    {
      id: 'indicadores',
      titulo: 'Indicadores de Pré-Vendas',
      descricao: 'Qualificação, agendamentos e assertividade no período selecionado.',
      conteudo: (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-6">
          <div className="xl:col-span-1">
            <KpiCard title="Qualificados (POSITIVO)" value={kpis?.qualificadosPositivos.toString() || "0"} icon={Target} change={0} isPositive={true} color="emerald" />
          </div>
          <div className="xl:col-span-1">
            <KpiCard title="Qualificados (NEGATIVO)" value={kpis?.qualificadosNegativos.toString() || "0"} icon={X} change={0} isPositive={false} color="rose" />
          </div>
          <div className="xl:col-span-1">
            <KpiCard
              title="Reuniões Agendadas"
              value={kpis?.reunioesAgendadasEfetivas.toString() || "0"}
              icon={CalendarDays}
              change={0}
              isPositive={true}
              color="teal"
              badge={{ label: 'Total', value: kpis?.reunioesAgendadas.toString() || "0" }}
            />
          </div>
          <div className="xl:col-span-1">
            <KpiCard title="Negócios Perdidos" value={kpis?.negociosPerdidos.toString() || "0"} icon={X} change={0} isPositive={false} color="rose" />
          </div>
          <div className="xl:col-span-1">
            <KpiCard title="Assertividade Agenda" value={`${(kpis?.assertividadeMedia || 0).toFixed(1)}%`} icon={TrendingUp} change={0} isPositive={true} color="teal" />
          </div>

          {filteredData?.metasFiltradas?.map((meta, idx) => (
            <div key={idx} className="xl:col-span-1">
              <MetaCard meta={meta} />
            </div>
          ))}
        </section>
      ),
    },
    {
      id: 'perdas-produtividade',
      titulo: 'Motivos de Perda e Produtividade',
      descricao: 'Distribuição das perdas e volume de conversão entre as etapas do funil.',
      conteudo: (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Motivos de Perda</h2>
              <p className="text-sm text-slate-500">Distribuição no período selecionado.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[440px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lossReasonData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
                    {lossReasonData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Produtividade do Funil</h2>
              <p className="text-sm text-slate-500">Volume de conversão entre etapas.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[440px] flex items-end justify-center gap-1 pb-4">
              <div className="w-[100px] group-data-[apresentacao]/slide:w-[160px] h-full bg-teal-600 rounded-t-lg flex flex-col justify-end p-2 text-white">
                <p className="text-xl group-data-[apresentacao]/slide:text-3xl font-bold">{funnelData.cadastro}</p>
                <p className="text-[10px] group-data-[apresentacao]/slide:text-sm">Cadastro</p>
              </div>
              <div className="w-[80px] group-data-[apresentacao]/slide:w-[130px] h-[80%] bg-teal-500 rounded-t-lg flex flex-col justify-end p-2 text-white">
                <p className="text-xl group-data-[apresentacao]/slide:text-3xl font-bold">{funnelData.cadencia}</p>
                <p className="text-[10px] group-data-[apresentacao]/slide:text-sm">Cadência</p>
              </div>
              <div className="w-[70px] group-data-[apresentacao]/slide:w-[115px] h-[60%] bg-teal-400 rounded-t-lg flex flex-col justify-end p-2 text-white">
                <p className="text-xl group-data-[apresentacao]/slide:text-3xl font-bold">{funnelData.emContato}</p>
                <p className="text-[10px] group-data-[apresentacao]/slide:text-sm">Em Contato</p>
              </div>
              <div className="w-[60px] group-data-[apresentacao]/slide:w-[100px] h-[40%] bg-teal-300 rounded-t-lg flex flex-col justify-end p-2 text-white text-center">
                <p className="text-xl group-data-[apresentacao]/slide:text-3xl font-bold">{funnelData.reunioes}</p>
                <p className="text-[10px] group-data-[apresentacao]/slide:text-sm">Reuniões</p>
              </div>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: 'atividades',
      titulo: 'Distribuição de Atividades',
      descricao: 'Volume de tarefas realizadas por tipo.',
      conteudo: (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 group-data-[apresentacao]/slide:lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Distribuição de Atividades</h2>
              <p className="text-sm text-slate-500">Volume por tipo de tarefa.</p>
            </div>
            <div className="h-[250px] group-data-[apresentacao]/slide:h-[480px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={atividadesData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10 }} />
                  <Radar name="Atividades" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                  <Tooltip />
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
      {/* TOOLBAR DE FILTROS */}
      <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-wrap items-center justify-between border-b border-slate-200/60 mb-6 bg-white shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={20} />
                <span className="text-sm font-medium text-slate-600">Período:</span>
             </div>
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

             <div className="flex items-center gap-2 ml-2">
                <input 
                   type="date" 
                   className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-teal-500"
                   value={dateRange.start}
                   onChange={(e) => { setDateRange(prev => ({ ...prev, start: e.target.value })); setPresetPresetLabel('Personalizado'); }}
                />
                <span className="text-slate-400 text-xs font-bold">ATÉ</span>
                <input 
                   type="date" 
                   className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-teal-500"
                   value={dateRange.end}
                   onChange={(e) => { setDateRange(prev => ({ ...prev, end: e.target.value })); setPresetPresetLabel('Personalizado'); }}
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
              <option value="Todos">Todos os SDRs</option>
              {filterOptions.sdrs.map(sdr => <option key={sdr} value={sdr}>{sdr}</option>)}
            </select>
            <BotaoApresentacao onClick={apresentacao.entrar} disabled={loading || !!error || !filteredData} />
            <div className="h-8 w-[1px] bg-slate-200 mx-2" />
            <div className="text-right">
               <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Período Selecionado</p>
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
              <React.Fragment key={slide.id}>{slide.conteudo}</React.Fragment>
            ))}
          </>
        )}
      </main>

      <ApresentacaoShell
        titulo="Pré-Vendas · Painel Gerencial"
        subtitulo="Visão consolidada da operação de pré-vendas"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
}
