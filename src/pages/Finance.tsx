import React, { useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  BarChart3, 
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { useStore } from '../hooks/useStore';
import { formatCurrency, cn } from '../utils/utils';

export default function Finance({ store }: { store: ReturnType<typeof useStore> }) {
  const stats = useMemo(() => {
    const completedBookings = store.bookings.filter(b => b.status === 'concluído');
    
    const totalRevenue = completedBookings.reduce((acc, b) => acc + b.finalPrice, 0);
    const totalServices = completedBookings.length;
    const averageTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Revenue by service type
    const revenueByService = store.serviceTypes.map(type => {
      const revenue = completedBookings
        .filter(b => b.serviceTypeId === type.id)
        .reduce((acc, b) => acc + b.finalPrice, 0);
      return { name: type.name, value: revenue };
    }).filter(d => d.value > 0);

    // Monthly revenue (last 6 months)
    const monthlyData = [...Array(6)].map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthLabel = date.toLocaleDateString('pt-BR', { month: 'short' });
      const month = date.getMonth();
      const year = date.getFullYear();

      const revenue = store.bookings
        .filter(b => {
          const bDate = new Date(b.date);
          return b.status === 'concluído' && bDate.getMonth() === month && bDate.getFullYear() === year;
        })
        .reduce((acc, b) => acc + b.finalPrice, 0);

      return { name: monthLabel, revenue };
    });

    return { totalRevenue, totalServices, averageTicket, revenueByService, monthlyData };
  }, [store.bookings, store.serviceTypes]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Financeiro</h2>
        <p className="text-slate-500">Controle seu faturamento e desempenho financeiro.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <FinanceCard 
          title="Faturamento Total" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={DollarSign} 
          trend="+12.5%" 
          positive={true}
        />
        <FinanceCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.averageTicket)} 
          icon={Target} 
          trend="+3.2%" 
          positive={true}
        />
        <FinanceCard 
          title="Serviços Realizados" 
          value={stats.totalServices} 
          icon={TrendingUp} 
          trend="+8.1%" 
          positive={true}
        />
        <FinanceCard 
          title="Projeção Mensal" 
          value={formatCurrency(stats.totalRevenue * 1.1)} 
          icon={BarChart3} 
          trend="+10%" 
          positive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Faturamento Mensal (R$)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#1e3a8a" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Faturamento por Serviço</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fill: '#64748b'}} 
                  width={120}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={20}>
                  {stats.revenueByService.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#1e3a8a' : '#000000'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ title, value, icon: Icon, trend, positive }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
          <Icon size={20} />
        </div>
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-lg",
          positive ? "bg-blue-50 text-blue-900" : "bg-red-50 text-red-600"
        )}>
          {positive ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
          {trend}
        </div>
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
