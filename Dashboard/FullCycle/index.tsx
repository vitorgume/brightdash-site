import { useState } from 'react';
import { Repeat } from 'lucide-react';
import OperacionalPreVendas from '../PreVendas/Operacional';
import OperacionalVendasDashboard from '../Vendas/Operacional';

export default function FullCycleDashboard() {
  const [view, setView] = useState<'PRE_VENDAS' | 'VENDAS'>('PRE_VENDAS');

  const toggleView = () => {
    setView(prev => prev === 'PRE_VENDAS' ? 'VENDAS' : 'PRE_VENDAS');
  };

  const SwitchButton = (
    <button
      onClick={toggleView}
      className="flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium shadow-sm text-sm transition-colors"
      title={view === 'PRE_VENDAS' ? "Alternar para Vendas" : "Alternar para Pré-Vendas"}
    >
      <Repeat size={18} />
      {view === 'PRE_VENDAS' ? "Painel Vendas" : "Painel Pré-Vendas"}
    </button>
  );

  if (view === 'PRE_VENDAS') {
    return <OperacionalPreVendas extraHeaderContent={SwitchButton} />;
  }

  return <OperacionalVendasDashboard extraHeaderContent={SwitchButton} />;
}
