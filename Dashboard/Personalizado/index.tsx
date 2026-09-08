import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LayoutGrid, ListChecks, Loader2, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { MetricaCard } from '../../../components/personalizado/MetricaCard';
import { WidgetCanvas } from '../../../components/personalizado/WidgetCanvas';
import { EditWidgetModal } from '../../../components/personalizado/EditWidgetModal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { DashboardPersonalizadoService } from '../../../../data/services/DashboardPersonalizadoService';
import type {
  MetricaDisponivel,
  WidgetDashboard,
} from '../../../../domain/models/DashboardPersonalizado';
import { PROMPTS_EXEMPLO, colunasDaLargura, exigeSerie } from './rotulos';

type Etapa = 'BRANCO' | 'MONTAGEM';

/** Identidade local do widget durante a montagem — o id definitivo só existe depois de salvo. */
interface WidgetEmMontagem {
  chave: string;
  widget: WidgetDashboard;
}

type Arrasto =
  | { tipo: 'METRICA'; metrica: MetricaDisponivel }
  | { tipo: 'WIDGET'; chave: string }
  | null;

const gerarChave = () => `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const CustomDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>('BRANCO');
  const [metricas, setMetricas] = useState<MetricaDisponivel[]>([]);
  const [carregandoMetricas, setCarregandoMetricas] = useState(true);
  const [erroMetricas, setErroMetricas] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [interpretando, setInterpretando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  // A posição no array é a ordem do widget; `ordem` só é materializado ao salvar.
  const [widgets, setWidgets] = useState<WidgetEmMontagem[]>([]);
  const [emEdicao, setEmEdicao] = useState<WidgetEmMontagem | null>(null);
  const [arrasto, setArrasto] = useState<Arrasto>(null);

  useEffect(() => {
    const carregarMetricas = async () => {
      try {
        setErroMetricas(null);
        setMetricas(await DashboardPersonalizadoService.listarMetricas());
      } catch (erro) {
        setErroMetricas(erro instanceof Error ? erro.message : 'Não foi possível carregar as métricas.');
      } finally {
        setCarregandoMetricas(false);
      }
    };
    carregarMetricas();
  }, []);

  const exigeUsuario = useMemo(
    () =>
      widgets.some(
        (item) => metricas.find((metrica) => metrica.chave === item.widget.chaveMetrica)?.exigeUsuario
      ),
    [widgets, metricas]
  );

  const criarWidget = (metrica: MetricaDisponivel): WidgetEmMontagem => {
    const agrupamento = metrica.agrupamentos[0] ?? 'NENHUM';
    return {
      chave: gerarChave(),
      widget: {
        titulo: metrica.rotulo,
        chaveMetrica: metrica.chave,
        rotuloMetrica: metrica.rotulo,
        tipoValor: metrica.tipoValor,
        // Sem agrupamento a métrica devolve um número só — gráfico não teria série para desenhar.
        tipoVisualizacao: agrupamento === 'NENHUM' ? 'KPI' : 'GRAFICO_BARRA',
        agrupamento,
        largura: 'METADE',
        colunas: colunasDaLargura('METADE'),
      },
    };
  };

  const gerarDashboard = async (evento: React.FormEvent) => {
    evento.preventDefault();

    if (!prompt.trim()) {
      showToast('Descreva o dashboard que você quer criar.', 'warning');
      return;
    }

    if (!user?.empresaId) {
      showToast('Não foi possível identificar a empresa da sua sessão.', 'error');
      return;
    }

    setInterpretando(true);
    try {
      const sugestao = await DashboardPersonalizadoService.interpretar(user.empresaId, prompt.trim());
      setTitulo(sugestao.titulo);
      setDescricao(sugestao.descricao ?? prompt.trim());
      setWidgets(sugestao.widgets.map((widget) => ({ chave: gerarChave(), widget })));
      setEtapa('MONTAGEM');
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : 'Não foi possível interpretar o prompt.', 'error');
    } finally {
      setInterpretando(false);
    }
  };

  const adicionarMetrica = (metrica: MetricaDisponivel) => {
    setWidgets((atuais) => [...atuais, criarWidget(metrica)]);
  };

  const iniciarArrastoMetrica = (
    evento: React.DragEvent<HTMLDivElement>,
    metrica: MetricaDisponivel
  ) => {
    setArrasto({ tipo: 'METRICA', metrica });
    evento.dataTransfer.effectAllowed = 'copy';
  };

  const iniciarArrastoWidget = (evento: React.DragEvent<HTMLDivElement>, chave: string) => {
    setArrasto({ tipo: 'WIDGET', chave });
    evento.dataTransfer.effectAllowed = 'move';
  };

  /** Reordena enquanto o widget passa sobre outro, para o usuário ver a disposição antes de soltar. */
  const arrastarSobreWidget = (chaveAlvo: string) => {
    if (arrasto?.tipo !== 'WIDGET' || arrasto.chave === chaveAlvo) return;

    setWidgets((atuais) => {
      const origem = atuais.findIndex((item) => item.chave === arrasto.chave);
      const destino = atuais.findIndex((item) => item.chave === chaveAlvo);
      if (origem < 0 || destino < 0) return atuais;

      const reordenados = [...atuais];
      const [movido] = reordenados.splice(origem, 1);
      reordenados.splice(destino, 0, movido);
      return reordenados;
    });
  };

  const permitirSoltar = (evento: React.DragEvent<HTMLDivElement>) => {
    if (!arrasto) return;
    evento.preventDefault();
    evento.dataTransfer.dropEffect = arrasto.tipo === 'METRICA' ? 'copy' : 'move';
  };

  const soltarNoCanvas = (evento: React.DragEvent<HTMLDivElement>) => {
    evento.preventDefault();
    if (arrasto?.tipo === 'METRICA') {
      setWidgets((atuais) => [...atuais, criarWidget(arrasto.metrica)]);
    }
    setArrasto(null);
  };

  const removerWidget = (chave: string) => {
    setWidgets((atuais) => atuais.filter((item) => item.chave !== chave));
  };

  const salvarWidget = (atualizado: WidgetDashboard) => {
    setWidgets((atuais) =>
      atuais.map((item) => (item.chave === emEdicao?.chave ? { ...item, widget: atualizado } : item))
    );
    setEmEdicao(null);
  };

  const reiniciar = () => {
    setEtapa('BRANCO');
    setPrompt('');
    setTitulo('');
    setDescricao('');
    setWidgets([]);
    setEmEdicao(null);
    setArrasto(null);
  };

  const salvarDashboard = async () => {
    if (!user?.empresaId) {
      showToast('Não foi possível identificar a empresa da sua sessão.', 'error');
      return;
    }

    if (!titulo.trim()) {
      showToast('Dê um título ao dashboard antes de salvar.', 'warning');
      return;
    }

    if (widgets.length === 0) {
      showToast('Adicione ao menos um widget ao dashboard.', 'warning');
      return;
    }

    setSalvando(true);
    try {
      await DashboardPersonalizadoService.criar(user.empresaId, {
        titulo: titulo.trim(),
        descricao: descricao.trim() || undefined,
        promptOriginal: prompt.trim() || undefined,
        widgets: widgets.map((item, indice) => ({
          ...item.widget,
          // Um gráfico sem agrupamento seria rebaixado a KPI no backend; alinhamos antes de enviar.
          tipoVisualizacao:
            exigeSerie(item.widget.tipoVisualizacao) && item.widget.agrupamento === 'NENHUM'
              ? 'KPI'
              : item.widget.tipoVisualizacao,
          ordem: indice,
        })),
      });

      showToast('Dashboard criado com sucesso.', 'success');
      reiniciar();
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : 'Não foi possível salvar o dashboard.', 'error');
    } finally {
      setSalvando(false);
    }
  };

  if (etapa === 'BRANCO') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
        <div className="max-w-2xl w-full text-center flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <div className="flex justify-center">
              <div className="p-4 bg-teal-50 rounded-full">
                <Sparkles className="w-8 h-8 text-teal-600" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">
              Crie seu dashboard personalizado
            </h1>
            <p className="text-lg text-slate-500">
              Descreva em linguagem natural o que você quer acompanhar e ajuste o layout
              arrastando as métricas.
            </p>
          </div>

          <form onSubmit={gerarDashboard} className="flex flex-col gap-4">
            <textarea
              value={prompt}
              onChange={(evento) => setPrompt(evento.target.value)}
              disabled={interpretando}
              placeholder="Ex: receita ganha e ticket médio por vendedor, com gráfico de barras"
              className="w-full px-6 py-4 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-700 text-base resize-none h-32 disabled:bg-slate-50"
            />

            <Button
              type="submit"
              icon={Sparkles}
              isLoading={interpretando}
              className="w-full py-3 text-base"
            >
              {interpretando ? 'Interpretando seu pedido…' : 'Gerar dashboard'}
            </Button>
          </form>

          <div className="pt-8 border-t border-slate-200 flex flex-col gap-4">
            <p className="text-sm text-slate-500">Exemplos de prompts:</p>
            <div className="flex flex-col items-center gap-2">
              {PROMPTS_EXEMPLO.map((exemplo) => (
                <button
                  key={exemplo.rotulo}
                  type="button"
                  onClick={() => setPrompt(exemplo.prompt)}
                  className="text-sm text-teal-600 hover:text-teal-700 hover:underline transition-colors"
                >
                  • {exemplo.rotulo}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => navigate('/dashboard/personalizado/lista')}
              className="inline-flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors mt-2"
            >
              <ListChecks className="w-4 h-4" />
              Ver dashboards já criados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[120rem] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              value={titulo}
              onChange={(evento) => setTitulo(evento.target.value)}
              aria-label="Título do dashboard"
              className="w-full text-2xl font-semibold text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 rounded-lg px-2 -ml-2 py-1 transition-colors"
            />
            <p className="text-sm text-slate-500 mt-1 px-2 -ml-2 truncate">{descricao}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="secondary" icon={RotateCcw} onClick={reiniciar} disabled={salvando}>
              Recomeçar
            </Button>
            <Button icon={Save} onClick={salvarDashboard} isLoading={salvando}>
              Salvar dashboard
            </Button>
          </div>
        </div>
      </header>

      {exigeUsuario && (
        <div className="max-w-[120rem] mx-auto px-6 pt-6">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Este dashboard usa métricas de painel individual. Ao visualizá-lo será preciso
              escolher um usuário — sem isso, esses widgets aparecem como indisponíveis.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-[120rem] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-28 flex flex-col gap-4">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-teal-600" />
                  Métricas disponíveis
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Arraste para o canvas (ou clique duas vezes) e reorganize os widgets como quiser.
                </p>
              </div>

              {carregandoMetricas ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 py-6">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando métricas…
                </div>
              ) : erroMetricas ? (
                <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                  {erroMetricas}
                </p>
              ) : (
                <div className="flex flex-col gap-3 lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto lg:pr-2">
                  {metricas.map((metrica) => (
                    <MetricaCard
                      key={metrica.chave}
                      metrica={metrica}
                      onDragStart={iniciarArrastoMetrica}
                      onDragEnd={() => setArrasto(null)}
                      onAdicionar={adicionarMetrica}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className="lg:col-span-3">
            <div
              onDragOver={permitirSoltar}
              onDrop={soltarNoCanvas}
              className={`border-2 border-dashed rounded-xl p-6 md:p-8 min-h-[32rem] transition-colors ${
                arrasto?.tipo === 'METRICA'
                  ? 'border-teal-400 bg-teal-50'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {widgets.length === 0 ? (
                <div className="min-h-[28rem] flex items-center justify-center text-center">
                  <div>
                    <p className="text-slate-500 font-medium">Arraste métricas para começar</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Depois você pode reordenar, editar e remover cada widget.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-6">
                  {widgets.map((item) => (
                    <WidgetCanvas
                      key={item.chave}
                      widget={item.widget}
                      chaveArrasto={item.chave}
                      isDragging={arrasto?.tipo === 'WIDGET' && arrasto.chave === item.chave}
                      onRemove={removerWidget}
                      onEdit={() => setEmEdicao(item)}
                      onDragStart={iniciarArrastoWidget}
                      onDragEnter={arrastarSobreWidget}
                      onDragEnd={() => setArrasto(null)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {emEdicao && (
        <EditWidgetModal
          widget={emEdicao.widget}
          metricas={metricas}
          onSave={salvarWidget}
          onClose={() => setEmEdicao(null)}
        />
      )}
    </div>
  );
};

export default CustomDashboard;
