import React, { useState } from 'react';
import { PieChart, LayoutDashboard, Target, TrendingUp, Users } from 'lucide-react';
import Gerencial1PreVendas from './PreVendas/Gerencial1';
import Gerencial2PreVendas from './PreVendas/Gerencial2';
import Gerencial1Vendas from './Vendas/Gerencial1';
import Gerencial2Vendas from './Vendas/Gerencial2';

type DashboardType = 'PRE_VENDAS_G1' | 'PRE_VENDAS_G2' | 'VENDAS_G1' | 'VENDAS_G2';

const Dashboard: React.FC = () => {
  const [activeDash, setActiveDash] = useState<DashboardType>('PRE_VENDAS_G1');

  const navItems = [
    { id: 'PRE_VENDAS_G1', label: 'Pré-Vendas: Gerencial 1', group: 'Pré-Vendas', icon: Target },
    { id: 'PRE_VENDAS_G2', label: 'Pré-Vendas: Gerencial 2', group: 'Pré-Vendas', icon: Users },
    { id: 'VENDAS_G1', label: 'Vendas: Gerencial 1', group: 'Vendas', icon: TrendingUp },
    { id: 'VENDAS_G2', label: 'Vendas: Gerencial 2', group: 'Vendas', icon: PieChart },
  ];

  const renderActiveDashboard = () => {
    switch (activeDash) {
      case 'PRE_VENDAS_G1': return <Gerencial1PreVendas />;
      case 'PRE_VENDAS_G2': return <Gerencial2PreVendas />;
      case 'VENDAS_G1': return <Gerencial1Vendas />;
      case 'VENDAS_G2': return <Gerencial2Vendas />;
      default: return <Gerencial1PreVendas />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sub-Header Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[100rem] mx-auto px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-teal-600" />
            <h1 className="text-xl font-bold text-slate-900">Central de Dashboards</h1>
          </div>

          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveDash(item.id as DashboardType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeDash === item.id
                    ? 'bg-white text-teal-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="dashboard-container">
        {/* Usamos um wrapper para evitar conflitos de scroll ou overflow se necessário */}
        {renderActiveDashboard()}
      </div>
    </div>
  );
};

export default Dashboard;
