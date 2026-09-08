import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Clock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { Select } from '../../../../components/ui/Select';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { WidgetRenderizadoCard } from '../../../../components/personalizado/WidgetRenderizadoCard';
import { ApresentacaoShell } from '../../../../components/apresentacao/ApresentacaoShell';
import { BotaoApresentacao } from '../../../../components/apresentacao/BotaoApresentacao';
import type { SlideApresentacao } from '../../../../components/apresentacao/tipos';
import { useModoApresentacao } from '../../../../hooks/useModoApresentacao';
import { useAuth } from '../../../../context/AuthContext';
import { DashboardPersonalizadoService } from '../../../../../data/services/DashboardPersonalizadoService';
import { EmpresaService } from '../../../../../data/services/EmpresaService';
import { UsuarioService } from '../../../../../data/services/UsuarioService';
import type {
  DashboardPersonalizado,
  WidgetRenderizado,
} from '../../../../../domain/models/DashboardPersonalizado';
import type { FunilCrm } from '../../../../../domain/models/Empresa';
import type { Usuario } from '../../../../../domain/models/Usuario';
import { MESES, colunasDaLargura } from '../rotulos';

const ANO_ATUAL = new Date().getFullYear();
const ANOS = [ANO_ATUAL, ANO_ATUAL - 1, ANO_ATUAL - 2];

const VisualizacaoDashboardPersonalizado: React.FC = () => {
  const { idDashboard } = useParams<{ idDashboard: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [funis, setFunis] = useState<FunilCrm[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [idFunil, setIdFunil] = useState('');
  const [ano, setAno] = useState(ANO_ATUAL);
  const [meses, setMeses] = useState<number[]>([new Date().getMonth() + 1]);
  const [idUsuario, setIdUsuario] = useState('');

  const [dashboard, setDashboard] = useState<DashboardPersonalizado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Os filtros dependem da empresa e são carregados uma vez; o funil inicial dispara a consulta.
  useEffect(() => {
    const carregarFiltros = async () => {
      if (!user?.empresaId) {
        setErro('Não foi possível identificar a empresa da sua sessão.');
        setCarregando(false);
        return;
      }

      try {
        const [empresa, listaUsuarios] = await Promise.all([
          EmpresaService.getById(user.empresaId),
          UsuarioService.getAll(user.empresaId),
        ]);

        const funisEmpresa = empresa.configuracao_crm?.funis ?? [];
        setFunis(funisEmpresa);
        setUsuarios(listaUsuarios);

        if (funisEmpresa.length === 0) {
          setErro('Nenhum funil configurado para a empresa.');
          setCarregando(false);
          return;
        }

        setIdFunil(funisEmpresa[0].id_funil_crm);
      } catch (excecao) {
        setErro(excecao instanceof Error ? excecao.message : 'Não foi possível carregar os filtros.');
        setCarregando(false);
      }
    };

    carregarFiltros();
  }, [user?.empresaId]);

  const carregarDados = useCallback(async () => {
    if (!idDashboard || !idFunil) return;

    setCarregando(true);
    try {
      setErro(null);
      setDashboard(
        await DashboardPersonalizadoService.obterDados(idDashboard, {
          ano,
          meses,
          idFunil,
          idUsuario: idUsuario || undefined,
        })
      );
    } catch (excecao) {
      setDashboard(null);
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível carregar o dashboard.');
    } finally {
      setCarregando(false);
    }
  }, [idDashboard, idFunil, ano, meses, idUsuario]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const alternarMes = (mes: number) => {
    setMeses((atuais) => {
      // O backend exige ao menos um mês; desmarcar o último deixaria o período vazio.
      if (atuais.includes(mes)) {
        return atuais.length === 1 ? atuais : atuais.filter((item) => item !== mes);
      }
      return [...atuais, mes].sort((a, b) => a - b);
    });
  };

  const especificacao = dashboard?.especificacao;

  /**
   * Este dashboard não tem seções fixas: os slides nascem agrupando os widgets em linhas
   * completas do grid de 12 colunas, o que preserva a ordem e a largura que o usuário montou.
   */
  const slides = useMemo<SlideApresentacao[]>(() => {
    const widgets = dashboard?.widgets ?? [];
    if (widgets.length === 0) return [];

    const linhas: WidgetRenderizado[][] = [];
    let linhaAtual: WidgetRenderizado[] = [];
    let colunasOcupadas = 0;

    widgets.forEach((renderizado) => {
      const colunas = renderizado.widget.colunas ?? colunasDaLargura(renderizado.widget.largura);

      if (colunasOcupadas + colunas > 12 && linhaAtual.length > 0) {
        linhas.push(linhaAtual);
        linhaAtual = [];
        colunasOcupadas = 0;
      }

      linhaAtual.push(renderizado);
      colunasOcupadas += colunas;
    });

    if (linhaAtual.length > 0) linhas.push(linhaAtual);

    return linhas.map((linha, indice) => ({
      id: `linha-${indice}`,
      // Uma linha com um widget só é o próprio indicador; com vários, vira um bloco numerado.
      titulo: linha.length === 1 ? linha[0].widget.titulo : `Indicadores ${indice + 1} de ${linhas.length}`,
      conteudo: (
        <div className="grid grid-cols-12 gap-6">
          {linha.map((renderizado, posicao) => (
            <WidgetRenderizadoCard
              key={renderizado.widget.id ?? `${indice}-${posicao}`}
              renderizado={renderizado}
            />
          ))}
        </div>
      ),
    }));
  }, [dashboard]);

  const apresentacao = useModoApresentacao(slides.length);
  const nomeFunilSelecionado = funis.find((funil) => funil.id_funil_crm === idFunil)?.nome_funil_crm;
  const contextoApresentacao = [
    nomeFunilSelecionado,
    String(ano),
    `${meses.length} ${meses.length === 1 ? 'mês' : 'meses'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[120rem] mx-auto px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/dashboard/personalizado/lista')}
                aria-label="Voltar para a lista"
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold text-slate-900 truncate">
                  {especificacao?.titulo ?? 'Dashboard personalizado'}
                </h1>
                {especificacao?.descricao && (
                  <p className="text-sm text-slate-500 truncate">{especificacao.descricao}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {dashboard?.ultimaAtualizacao && (
                <span className="hidden lg:inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  Atualizado em{' '}
                  {new Date(dashboard.ultimaAtualizacao).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              )}
              <BotaoApresentacao
                onClick={apresentacao.entrar}
                disabled={carregando || !!erro || slides.length === 0}
              />
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={carregarDados}
                disabled={carregando}
              >
                Atualizar
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="w-full lg:w-64">
              <Select
                label="Funil"
                value={idFunil}
                onChange={(evento) => setIdFunil(evento.target.value)}
                options={funis.map((funil) => ({
                  value: funil.id_funil_crm,
                  label: funil.nome_funil_crm,
                }))}
              />
            </div>

            <div className="w-full lg:w-32">
              <Select
                label="Ano"
                value={String(ano)}
                onChange={(evento) => setAno(Number(evento.target.value))}
                options={ANOS.map((valor) => ({ value: String(valor), label: String(valor) }))}
              />
            </div>

            {especificacao?.exigeUsuario && (
              <div className="w-full lg:w-64">
                <Select
                  label="Usuário (métricas individuais)"
                  value={idUsuario}
                  onChange={(evento) => setIdUsuario(evento.target.value)}
                  options={[
                    { value: '', label: 'Nenhum selecionado' },
                    ...usuarios.map((usuario) => ({ value: usuario.id ?? '', label: usuario.nome })),
                  ]}
                />
              </div>
            )}

            <div className="flex-1">
              <span className="text-sm font-medium text-slate-700">Meses</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {MESES.map((mes) => {
                  const ativo = meses.includes(mes.valor);
                  return (
                    <button
                      key={mes.valor}
                      type="button"
                      onClick={() => alternarMes(mes.valor)}
                      aria-pressed={ativo}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        ativo
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {mes.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[120rem] mx-auto px-6 py-8">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-24">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando dados…
          </div>
        ) : erro ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700">{erro}</div>
        ) : !dashboard || dashboard.semDados ? (
          <EmptyStateMessage
            title="Sem dados para este recorte"
            description="Nenhum indicador deste dashboard encontrou dados no período e filtros selecionados."
            subtitle="Tente outro funil, ano ou conjunto de meses."
          />
        ) : (
          <div className="grid grid-cols-12 gap-6">
            {dashboard.widgets.map((renderizado, indice) => (
              <WidgetRenderizadoCard
                key={renderizado.widget.id ?? indice}
                renderizado={renderizado}
              />
            ))}
          </div>
        )}
      </div>

      <ApresentacaoShell
        titulo={especificacao?.titulo ?? 'Dashboard personalizado'}
        subtitulo={especificacao?.descricao}
        contexto={contextoApresentacao}
        slides={slides}
        controle={apresentacao}
      />
    </div>
  );
};

export default VisualizacaoDashboardPersonalizado;
