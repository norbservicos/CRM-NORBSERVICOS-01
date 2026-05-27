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
  Line,
  Legend
} from 'recharts';
import { useStore } from '../hooks/useStore';
import { formatCurrency, cn } from '../utils/utils';

export default function Finance({ store }: { store: ReturnType<typeof useStore> }) {
  const stats = useMemo(() => {
    const completedBookings = store.bookings.filter(b => b.status === 'concluído');
    
    const totalRevenue = completedBookings.reduce((acc, b) => acc + b.finalPrice, 0);
    const totalExpenses = store.expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const totalServices = completedBookings.length;
    const averageTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Revenue by service type
    const revenueByService = store.serviceTypes.map(type => {
      const revenue = completedBookings
        .filter(b => b.serviceTypeId === type.id)
        .reduce((acc, b) => acc + b.finalPrice, 0);
      return { name: type.name, value: revenue };
    }).filter(d => d.value > 0);

    // Monthly revenue and expenses (last 6 months)
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

      const expenses = store.expenses
        .filter(e => {
          const eDate = new Date(e.date);
          return eDate.getMonth() === month && eDate.getFullYear() === year;
        })
        .reduce((acc, e) => acc + e.amount, 0);

      return { name: monthLabel, revenue, expenses, profit: revenue - expenses };
    });

    return { totalRevenue, totalExpenses, netProfit, totalServices, averageTicket, revenueByService, monthlyData };
  }, [store.bookings, store.serviceTypes, store.expenses]);

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">Financeiro</h2>
        <p className="text-xs md:text-sm text-slate-500">Controle seu faturamento e desempenho financeiro.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <FinanceCard 
          title="Faturamento" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={DollarSign} 
          trend="+12%" 
          positive={true}
        />
        <FinanceCard 
          title="Gastos" 
          value={formatCurrency(stats.totalExpenses)} 
          icon={ArrowDownRight} 
          trend="-5%" 
          positive={false}
        />
        <FinanceCard 
          title="Lucro" 
          value={formatCurrency(stats.netProfit)} 
          icon={TrendingUp} 
          trend="+15%" 
          positive={stats.netProfit >= 0}
        />
        <FinanceCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.averageTicket)} 
          icon={Target} 
          trend="+3%" 
          positive={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Monthly Revenue Chart */}
        <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6">Desempenho Mensal (R$)</h3>
          <div className="h-[250px] md:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'revenue' ? 'Faturamento' : name === 'expenses' ? 'Gastos' : 'Lucro']}
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Faturamento"
                  stroke="#1e3a8a" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#1e3a8a', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  name="Gastos"
                  stroke="#ef4444" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  name="Lucro"
                  stroke="#10b981" 
                  strokeWidth={2} 
                  dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service Chart */}
        <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base md:text-lg font-bold mb-4 md:mb-6">Faturamento por Serviço</h3>
          <div className="h-[250px] md:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={stats.revenueByService} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fill: '#64748b'}} 
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                />
                <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={15}>
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
    <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-2 sm:mb-4">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
          <Icon size={16} className="sm:size-5" />
        </div>
        <div className={cn(
          "flex items-center text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg",
          positive ? "bg-blue-50 text-blue-900" : "bg-red-50 text-red-600"
        )}>
          {positive ? <ArrowUpRight size={10} className="sm:size-3 mr-0.5 sm:mr-1" /> : <ArrowDownRight size={10} className="sm:size-3 mr-0.5 sm:mr-1" />}
          {trend}
        </div>
      </div>
      <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5 sm:mb-1">{title}</p>
      <p className="text-lg sm:text-2xl font-black text-slate-900 truncate">{value}</p>
    </div>
  );
}
