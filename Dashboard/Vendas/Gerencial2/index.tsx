import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Package, Users, Loader2, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { MetricasVendasService } from '../../../../../data/services/MetricasVendasService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { type DadosVendasGerencial2 } from '../../../../../domain/models/DadosVendasGerencial2';
import { type FunilCrm } from '../../../../../domain/models/Empresa';
import { useAuth } from '../../../../context/AuthContext';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { ApresentacaoShell } from '../../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../../components/apresentacao/BotaoApresentacao';
import { type SlideApresentacao } from '../../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../../hooks/useModoApresentacao';
import { ehRecursoNaoEncontrado, mensagemDeErro } from '../../../../../infrastructure/api/ApiError';

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

// --- COMPONENTES AUXILIARES ---
interface TabelaPerdasProps {
  titulo: string;
  dados: { motivo: string; quantidade: number }[];
}

const TabelaPerdas: React.FC<TabelaPerdasProps> = ({ titulo, dados }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
      <AlertTriangle size={18} className="text-amber-500" />
      <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
    </div>
    <div className="overflow-x-auto flex-1">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-y border-slate-200">
          <tr>
            <th className="px-4 py-3 font-medium">Motivo</th>
            <th className="px-4 py-3 font-medium text-right">Quantidade</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {dados.map((item, index) => (
            <tr key={index} className="bg-white hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{item.motivo}</td>
              <td className="px-4 py-3 text-slate-700 text-right font-semibold">{item.quantidade}</td>
            </tr>
          ))}
          {dados.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-8 text-center text-slate-500">Nenhum dado registrado.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// --- TELA PRINCIPAL ---
export default function Gerencial2VendasDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DadosVendasGerencial2 | null>(null);
  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- NOVOS ESTADOS DE FILTRO ---
  const [selectedFunil, setSelectedFunil] = useState<string>('');
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

  const mergeGerencial2 = (a: DadosVendasGerencial2, b: DadosVendasGerencial2): DadosVendasGerencial2 => ({
    ...a,
    ...b,
    motivosPerdaReuniaoMarcada: [...(a.motivosPerdaReuniaoMarcada ?? []), ...(b.motivosPerdaReuniaoMarcada ?? [])],
    motivosPerdaProposta: [...(a.motivosPerdaProposta ?? []), ...(b.motivosPerdaProposta ?? [])],
    motivosPerdaNegociacao: [...(a.motivosPerdaNegociacao ?? []), ...(b.motivosPerdaNegociacao ?? [])],
    produtosVendidos: [...(a.produtosVendidos ?? []), ...(b.produtosVendidos ?? [])],
    vendas: [...(a.vendas ?? []), ...(b.vendas ?? [])],
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

        let resultGerencial: DadosVendasGerencial2;

        if (startYear === endYear) {
          const meses: number[] = [];
          for (let m = start.getMonth() + 1; m <= end.getMonth() + 1; m++) {
            meses.push(m);
          }
          resultGerencial = await MetricasVendasService.getGerencial2(user.empresaId, selectedFunil, startYear, meses);
        } else {
          const mesesAnoInicio: number[] = [];
          for (let m = start.getMonth() + 1; m <= 12; m++) mesesAnoInicio.push(m);

          const mesesAnoFim: number[] = [];
          for (let m = 1; m <= end.getMonth() + 1; m++) mesesAnoFim.push(m);

          const [r1, r2] = await Promise.all([
            MetricasVendasService.getGerencial2(user.empresaId, selectedFunil, startYear, mesesAnoInicio),
            MetricasVendasService.getGerencial2(user.empresaId, selectedFunil, endYear, mesesAnoFim),
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

  // --- LÓGICA DE FILTRAGEM ATUALIZADA (CALENDÁRIO) ---
  const filteredData = useMemo(() => {
    if (!data) return null;

    const start = parseDateInput(dateRange.start);
    start.setHours(0, 0, 0, 0);
    const end = parseDateInput(dateRange.end);
    end.setHours(23, 59, 59, 999);

    const filterItem = (item: any) => {
        let matchesDate = false;

        if (item.timestamp) {
            const date = new Date(item.timestamp);
            matchesDate = date >= start && date <= end;
        }

        return matchesDate;
    };
    
    return {
        ...data,
        motivosPerdaReuniaoMarcada: data.motivosPerdaReuniaoMarcada.filter(filterItem),
        motivosPerdaProposta: data.motivosPerdaProposta.filter(filterItem),
        motivosPerdaNegociacao: data.motivosPerdaNegociacao.filter(filterItem),
        produtosVendidos: data.produtosVendidos.filter(filterItem),
        vendas: data.vendas.filter(filterItem),
    };
  }, [data, dateRange]);

  // --- Agregação para Tabelas e Gráficos ---
  const aggregateByAttribute = (list: any[], attr: string) => {
      const counts: Record<string, number> = {};
      list.forEach(item => {
          const key = item[attr] || 'Não informado';
          counts[key] = (counts[key] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, quantidade]) => ({ motivo: name, name, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);
  };

  const processedData = useMemo(() => {
      if (!filteredData) return null;
      return {
          perdasReuniao: aggregateByAttribute(filteredData.motivosPerdaReuniaoMarcada, 'motivo'),
          perdasProposta: aggregateByAttribute(filteredData.motivosPerdaProposta, 'motivo'),
          perdasNegociacao: aggregateByAttribute(filteredData.motivosPerdaNegociacao, 'motivo'),
          rankProdutos: aggregateByAttribute(filteredData.produtosVendidos, 'nome'),
          rankVendedores: aggregateByAttribute(filteredData.vendas.map(v => ({ nome: v.nomeUsuario || v.usuario?.nome })), 'nome'),
      };
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
      id: 'motivos-perda',
      titulo: 'Motivos de Perda por Etapa',
      descricao: 'Onde os negócios são perdidos: reunião marcada, proposta e negociação.',
      conteudo: (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TabelaPerdas titulo="Motivos de Perda (Reunião Marcada)" dados={processedData?.perdasReuniao || []} />
          <TabelaPerdas titulo="Motivos de Perda (Proposta)" dados={processedData?.perdasProposta || []} />
          <TabelaPerdas titulo="Motivos de Perda (Negociação)" dados={processedData?.perdasNegociacao || []} />
        </section>
      ),
    },
    {
      id: 'rankings',
      titulo: 'Rankings de Produtos e Vendedores',
      descricao: 'Volume de vendas por produto e performance individual do time.',
      conteudo: (
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Package size={20} /></div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Rank de Produtos</h2>
                <p className="text-sm text-slate-500">Volume de vendas por produto.</p>
              </div>
            </div>
            <div className="h-[300px] min-h-[300px] group-data-[apresentacao]/slide:h-[480px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData?.rankProdutos || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Bar dataKey="quantidade" name="Quantidade Vendida" fill="#0d9488" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Users size={20} /></div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Rank de Vendedores</h2>
                <p className="text-sm text-slate-500">Volume de vendas por SDR/Closer.</p>
              </div>
            </div>
            <div className="h-[300px] min-h-[300px] group-data-[apresentacao]/slide:h-[480px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData?.rankVendedores || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
                  <Bar dataKey="quantidade" name="Vendas Realizadas" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={60} />
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
  const contextoApresentacao = [presetLabel, nomeFunilSelecionado].filter(Boolean).join(' · ');

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
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-20 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-slate-900">Erro</h2>
              <p className="text-slate-500">{error}</p>
            </div>
          </div>
        ) : !filteredData ? (
          <EmptyStateMessage
            title="Nenhum dado disponível"
            description="Não há dados para o período selecionado."
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
        titulo="Vendas · Perdas e Rankings"
        subtitulo="Onde os negócios são perdidos e quem mais vende"
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
}
