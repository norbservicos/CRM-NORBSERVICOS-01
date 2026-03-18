import React, { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  DollarSign,
  Download,
  XCircle,
  ArrowDownRight,
  ClipboardList
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { formatCurrency, cn } from '../utils/utils';
import { Logo } from '../components/Logo';
import { useStore } from '../hooks/useStore';
import type { Booking } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface DashboardProps {
  store: ReturnType<typeof useStore>;
  setActiveTab: (tab: any) => void;
}

export default function Dashboard({ store, setActiveTab }: DashboardProps) {
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState('');

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const filteredBookings = store.bookings.filter(b => {
      const bDate = new Date(b.date);
      const matchesMonth = bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
      const matchesDate = filterDate ? b.date === filterDate : true;
      const matchesType = filterType ? b.serviceTypeId === filterType : true;
      return matchesMonth && matchesDate && matchesType;
    });

    const totalMonth = filteredBookings.length;
    const scheduled = filteredBookings.filter(b => b.status === 'agendado').length;
    const lost = filteredBookings.filter(b => b.status === 'perdido').length;
    const completed = filteredBookings.filter(b => b.status === 'concluído').length;
    const completedBookings = filteredBookings.filter(b => b.status === 'concluído');
    const totalRevenue = completedBookings.reduce((acc, b) => acc + b.finalPrice, 0);

    // Calculate expenses for the month
    const totalExpenses = store.expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    }).reduce((acc, e) => acc + e.amount, 0);

    const profit = totalRevenue - totalExpenses;

    // Gender breakdown for bookings in the filtered period
    let menCount = 0;
    let womenCount = 0;
    filteredBookings.forEach(b => {
      const client = store.clients.find(c => c.id === b.clientId);
      if (client?.gender === 'masculino') menCount++;
      else if (client?.gender === 'feminino') womenCount++;
    });

    // Calculate service type distribution
    const typeDistributionMap: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const service = store.serviceTypes.find(s => s.id === b.serviceTypeId);
      const name = service?.name || 'Outros';
      typeDistributionMap[name] = (typeDistributionMap[name] || 0) + 1;
    });

    const typeDistribution = Object.entries(typeDistributionMap).map(([name, value]) => ({
      name,
      value
    })).sort((a, b) => b.value - a.value);

    return { 
      totalMonth, 
      scheduled, 
      lost, 
      completed, 
      totalRevenue, 
      totalExpenses, 
      profit, 
      menCount, 
      womenCount, 
      typeDistribution 
    };
  }, [store.bookings, store.expenses, filterDate, filterType, store.serviceTypes, store.clients]);

  const statusChartData = [
    { name: 'Concluídos', value: stats.completed, color: '#1e3a8a' },
    { name: 'Perdidos', value: stats.lost, color: '#ef4444' },
    { name: 'Agendados', value: stats.scheduled, color: '#3b82f6' },
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

  const genderData = [
    { name: 'Masculino', value: store.clients.filter(c => c.gender === 'masculino').length, color: '#3b82f6' },
    { name: 'Feminino', value: store.clients.filter(c => c.gender === 'feminino').length, color: '#ec4899' },
    { name: 'Outro', value: store.clients.filter(c => c.gender === 'outro').length, color: '#94a3b8' },
  ];

  const paymentData = [
    { name: 'PIX', value: store.bookings.filter(b => b.paymentMethod === 'pix').length, color: '#141414' },
    { name: 'Dinheiro', value: store.bookings.filter(b => b.paymentMethod === 'dinheiro').length, color: '#22c55e' },
    { name: 'Cartão', value: store.bookings.filter(b => b.paymentMethod === 'cartão').length, color: '#3b82f6' },
  ];

  const generateReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Relatório Mensal - NORB Gestão Pro', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Data de geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 32);
    
    const summaryData = [
      ['Total de Serviços', stats.totalMonth.toString()],
      ['Serviços Concluídos', stats.completed.toString()],
      ['Serviços Perdidos', stats.lost.toString()],
      ['Serviços Agendados', stats.scheduled.toString()],
      ['Faturamento Total', formatCurrency(stats.totalRevenue)],
      ['Total de Gastos', formatCurrency(stats.totalExpenses)],
      ['Lucro Líquido', formatCurrency(stats.profit)],
      ['Clientes Homens (Agendados)', stats.menCount.toString()],
      ['Clientes Mulheres (Agendados)', stats.womenCount.toString()],
    ];

    (doc as any).autoTable({
      startY: 40,
      head: [['Indicador', 'Valor']],
      body: summaryData,
    });

    doc.save(`relatorio-norb-${new Date().toISOString().slice(0, 7)}.pdf`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-900/10">
            <Logo collapsed className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Olá, NORB!</h2>
            <p className="text-slate-500">Aqui está o que está acontecendo na sua empresa hoje.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={generateReport}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={18} className="mr-2" />
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap gap-4 items-end shadow-sm">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrar por Data</label>
          <input 
            type="date" 
            className="block w-full rounded-xl border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Serviço</label>
          <select 
            className="block w-full rounded-xl border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">Todos os serviços</option>
            {store.serviceTypes.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setFilterDate(''); setFilterType(''); }}
          className="text-sm text-blue-900 font-medium hover:underline pb-2"
        >
          Limpar filtros
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Agendados" 
          value={stats.scheduled} 
          icon={Calendar} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Faturamento" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={DollarSign} 
          color="bg-slate-900" 
        />
        <StatCard 
          title="Gastos" 
          value={formatCurrency(stats.totalExpenses)} 
          icon={ArrowDownRight} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Lucro" 
          value={formatCurrency(stats.profit)} 
          icon={TrendingUp} 
          color="bg-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          title="Serviços Mês" 
          value={stats.totalMonth} 
          icon={ClipboardList} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Perdidos" 
          value={stats.lost} 
          icon={XCircle} 
          color="bg-red-500" 
        />
        <StatCard 
          title="Concluídos" 
          value={stats.completed} 
          icon={CheckCircle2} 
          color="bg-blue-900" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Status dos Serviços</h3>
          <div className="h-[250px] w-full">
            {statusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Nenhum dado para exibir.
              </div>
            )}
          </div>
        </div>

        {/* Gender Distribution Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Gênero dos Clientes</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Formas de Pagamento</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Service Type Distribution Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Distribuição por Tipo de Serviço</h3>
          <div className="h-[300px] w-full">
            {stats.typeDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.typeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.typeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => {
                      const percentage = ((value / stats.totalMonth) * 100).toFixed(1);
                      return [`${value} (${percentage}%)`, 'Quantidade'];
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Nenhum serviço registrado.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions / Recent */}
        <div className="lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold mb-6">Próximos Serviços</h3>
          <div className="space-y-4 flex-1">
            {store.bookings
              .filter(b => b.status === 'agendado')
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .slice(0, 5)
              .map(booking => {
                const client = store.clients.find(c => c.id === booking.clientId);
                const service = store.serviceTypes.find(s => s.id === booking.serviceTypeId);
                return (
                  <div key={booking.id} className="flex items-center p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mr-3 shrink-0">
                      <Calendar size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{client?.name || 'Cliente Removido'}</p>
                      <p className="text-xs text-slate-500 truncate">{service?.name} • {booking.date}</p>
                    </div>
                  </div>
                );
              })}
            {store.bookings.filter(b => b.status === 'agendado').length === 0 && (
              <p className="text-sm text-slate-400 text-center py-8 italic">Nenhum agendamento futuro.</p>
            )}
          </div>
          <button 
            onClick={() => setActiveTab('services')}
            className="mt-6 w-full py-3 text-sm font-bold text-blue-900 hover:bg-blue-50 rounded-xl transition-colors"
          >
            Ver todos os serviços
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className={cn("absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110", color)} />
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg", color)}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
