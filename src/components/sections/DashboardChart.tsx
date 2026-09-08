import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { rankVendedores, lossReasonData } from '../../data/dashboard-preview';

const rankSummary = `Rank de vendedores por negócios ganhos no período: ${rankVendedores
  .map((row) => `${row.name} com ${row.quantidade}`)
  .join(', ')}.`;

const lossSummary = `Motivos de perda dos negócios no período: ${lossReasonData
  .map((row) => `${row.name} representa ${row.value} negócios perdidos`)
  .join(', ')}.`;

// Mesmo padrão visual dos gráficos "Rank de Vendedores" e "Motivos de Perda"
// do painel real do Metriza (cores, grid e tooltip idênticos).
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
        {payload.map((entry: any) => (
          <p key={entry.name} className="text-sm flex items-center gap-2" style={{ color: entry.fill || entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill || entry.color }} />
            {entry.name}: <span className="font-medium text-slate-700">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function RankVendedoresChart() {
  return (
    <div>
      <div aria-hidden="true" style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rankVendedores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
            <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
            <Bar dataKey="quantidade" name="Negócios Ganhos" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={60} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{rankSummary}</p>
      <table className="sr-only">
        <caption>Rank de vendedores por negócios ganhos</caption>
        <thead>
          <tr>
            <th scope="col">Vendedor</th>
            <th scope="col">Negócios ganhos</th>
          </tr>
        </thead>
        <tbody>
          {rankVendedores.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{row.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MotivosPerdaChart() {
  return (
    <div>
      <div aria-hidden="true" style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={lossReasonData} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey="value">
              {lossReasonData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 20, color: '#64748B' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{lossSummary}</p>
      <table className="sr-only">
        <caption>Motivos de perda dos negócios</caption>
        <thead>
          <tr>
            <th scope="col">Motivo</th>
            <th scope="col">Negócios perdidos</th>
          </tr>
        </thead>
        <tbody>
          {lossReasonData.map((row) => (
            <tr key={row.name}>
              <th scope="row">{row.name}</th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
