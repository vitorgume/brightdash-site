import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Loader2, Plus, Sparkles, Trash2, Users } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { EmptyStateMessage } from '../../../../components/EmptyStateMessage';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { DashboardPersonalizadoService } from '../../../../../data/services/DashboardPersonalizadoService';
import type { EspecificacaoDashboard } from '../../../../../domain/models/DashboardPersonalizado';

const ListaDashboardsPersonalizados: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [dashboards, setDashboards] = useState<EspecificacaoDashboard[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!user?.empresaId) {
      setErro('Não foi possível identificar a empresa da sua sessão.');
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      setErro(null);
      setDashboards(await DashboardPersonalizadoService.listarPorEmpresa(user.empresaId));
    } catch (excecao) {
      setErro(excecao instanceof Error ? excecao.message : 'Não foi possível carregar os dashboards.');
    } finally {
      setCarregando(false);
    }
  }, [user?.empresaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const deletar = async (dashboard: EspecificacaoDashboard) => {
    setDeletando(dashboard.id);
    try {
      await DashboardPersonalizadoService.deletar(dashboard.id);
      setDashboards((atuais) => atuais.filter((item) => item.id !== dashboard.id));
      showToast('Dashboard removido.', 'success');
    } catch (excecao) {
      showToast(
        excecao instanceof Error ? excecao.message : 'Não foi possível remover o dashboard.',
        'error'
      );
    } finally {
      setDeletando(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-teal-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Dashboards personalizados</h1>
              <p className="text-sm text-slate-500">
                Montados por prompt e atualizados com os dados do CRM a cada abertura.
              </p>
            </div>
          </div>
          <Button icon={Plus} onClick={() => navigate('/dashboard/personalizado')}>
            Novo dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-[100rem] mx-auto px-6 py-8">
        {carregando ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-24">
            <Loader2 className="w-5 h-5 animate-spin" />
            Carregando dashboards…
          </div>
        ) : erro ? (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-700">{erro}</div>
        ) : dashboards.length === 0 ? (
          <EmptyStateMessage
            title="Nenhum dashboard personalizado ainda"
            description="Descreva o que você quer acompanhar e monte o seu primeiro."
            subtitle="Clique em “Novo dashboard” para começar."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <article
                key={dashboard.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-4 hover:border-teal-300 transition-colors"
              >
                <div className="flex-1">
                  <h2 className="font-semibold text-slate-900">{dashboard.titulo}</h2>
                  {dashboard.descricao && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{dashboard.descricao}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    <LayoutGrid className="w-3 h-3" />
                    {dashboard.widgets.length}{' '}
                    {dashboard.widgets.length === 1 ? 'indicador' : 'indicadores'}
                  </span>
                  {dashboard.exigeUsuario && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
                      <Users className="w-3 h-3" />
                      Exige usuário
                    </span>
                  )}
                  {dashboard.dataCriacao && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                      {new Date(dashboard.dataCriacao).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button
                    className="flex-1"
                    onClick={() => navigate(`/dashboard/personalizado/${dashboard.id}`)}
                  >
                    Abrir
                  </Button>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    isLoading={deletando === dashboard.id}
                    onClick={() => deletar(dashboard)}
                    aria-label={`Remover ${dashboard.titulo}`}
                  >
                    Remover
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListaDashboardsPersonalizados;
