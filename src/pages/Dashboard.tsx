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
  ClipboardList,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  Check
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
import { formatCurrency, cn, parseDate, formatDate } from '../utils/utils';
import { format, startOfMonth, isSameMonth, subMonths, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [filterType, setFilterType] = useState('');
  const [showValues, setShowValues] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const inactiveClients = useMemo(() => {
    const fourMonthsAgo = subMonths(new Date(), 4);
    
    return store.clients.filter(client => {
      const clientBookings = store.bookings
        .filter(b => b.clientId === client.id && b.status === 'concluído')
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
      
      const lastBooking = clientBookings[0];
      if (!lastBooking) return false;
      
      const lastBookingDate = parseDate(lastBooking.date);
      const isInactive = isBefore(lastBookingDate, fourMonthsAgo);
      
      if (!isInactive) return false;
      
      if (client.lastNotificationDismissedAt) {
        const dismissedAt = new Date(client.lastNotificationDismissedAt);
        if (!isBefore(dismissedAt, fourMonthsAgo)) {
          return false;
        }
      }
      
      return true;
    }).map(client => {
      const lastBooking = store.bookings
        .filter(b => b.clientId === client.id && b.status === 'concluído')
        .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())[0];
      return { ...client, lastBookingDate: lastBooking.date };
    });
  }, [store.clients, store.bookings]);

  const markAsDone = async (clientId: string) => {
    try {
      await store.updateClient(clientId, {
        lastNotificationDismissedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating client notification:', error);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem? Notamos que faz um tempo que você não nos visita. Gostaríamos de saber se está precisando de algo!`);
    window.open(`https://wa.me/${cleanPhone.length <= 11 ? '55' + cleanPhone : cleanPhone}?text=${message}`, '_blank');
  };

  const stats = useMemo(() => {
    const filteredBookings = store.bookings.filter(b => {
      const bDate = parseDate(b.date);
      
      let matchesPeriod = false;
      if (filterMode === 'month') {
        const currentMonth = selectedDate.getMonth();
        const currentYear = selectedDate.getFullYear();
        matchesPeriod = bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
      } else {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        matchesPeriod = bDate >= start && bDate <= end;
      }

      const matchesType = filterType ? b.serviceTypeId === filterType : true;
      return matchesPeriod && matchesType;
    });

    const totalMonth = filteredBookings.length;
    const scheduled = filteredBookings.filter(b => b.status === 'agendado').length;
    const lost = filteredBookings.filter(b => b.status === 'perdido').length;
    const completed = filteredBookings.filter(b => b.status === 'concluído').length;
    
    const completedBookings = filteredBookings.filter(b => b.status === 'concluído');
    const scheduledBookings = filteredBookings.filter(b => b.status === 'agendado');
    
    // Valor Recebido: Apenas concluídos
    const receivedValue = completedBookings.reduce((acc, b) => acc + b.finalPrice, 0);
    
    // Valor a Receber: Apenas agendados
    const toReceiveValue = scheduledBookings.reduce((acc, b) => acc + b.finalPrice, 0);
    
    // Faturamento: Concluídos + Agendados
    const totalRevenue = receivedValue + toReceiveValue;

    // Calculate expenses for the month
    const totalExpenses = store.expenses.filter(e => {
      const eDate = parseDate(e.date);
      if (filterMode === 'month') {
        const currentMonth = selectedDate.getMonth();
        const currentYear = selectedDate.getFullYear();
        return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
      } else {
        const start = parseDate(startDate);
        const end = parseDate(endDate);
        return eDate >= start && eDate <= end;
      }
    }).reduce((acc, e) => acc + e.amount, 0);

    const profit = receivedValue - totalExpenses;

    // Gender breakdown for COMPLETED bookings in the filtered period
    let menCount = 0;
    let womenCount = 0;
    let otherGenderCount = 0;
    completedBookings.forEach(b => {
      const client = store.clients.find(c => c.id === b.clientId);
      if (client?.gender === 'masculino') menCount++;
      else if (client?.gender === 'feminino') womenCount++;
      else otherGenderCount++;
    });

    // Payment method breakdown for COMPLETED bookings
    const paymentMethods = {
      pix: completedBookings.filter(b => b.paymentMethod === 'pix').length,
      dinheiro: completedBookings.filter(b => b.paymentMethod === 'dinheiro').length,
      cartão: completedBookings.filter(b => b.paymentMethod === 'cartão').length,
    };

    // Calculate service type distribution for COMPLETED bookings
    const typeDistributionMap: Record<string, number> = {};
    completedBookings.forEach(b => {
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
      receivedValue,
      toReceiveValue,
      totalExpenses, 
      profit, 
      menCount, 
      womenCount, 
      otherGenderCount,
      paymentMethods,
      typeDistribution 
    };
  }, [store.bookings, store.expenses, filterMode, selectedDate, startDate, endDate, filterType, store.serviceTypes, store.clients]);

  const isCurrentMonth = isSameMonth(selectedDate, new Date());

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    if (offset > 0 && newDate > new Date()) return;
    setSelectedDate(newDate);
  };

  const statusChartData = [
    { name: 'Concluídos', value: stats.completed, color: '#22c55e' },
    { name: 'Perdidos', value: stats.lost, color: '#ef4444' },
    { name: 'Agendados', value: stats.scheduled, color: '#eab308' },
  ].filter(d => d.value > 0);

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

  const genderData = [
    { name: 'Masculino', value: stats.menCount, color: '#3b82f6' },
    { name: 'Feminino', value: stats.womenCount, color: '#ec4899' },
    { name: 'Outro', value: stats.otherGenderCount, color: '#94a3b8' },
  ].filter(d => d.value > 0);

  const paymentData = [
    { name: 'PIX', value: stats.paymentMethods.pix, color: '#141414' },
    { name: 'Dinheiro', value: stats.paymentMethods.dinheiro, color: '#22c55e' },
    { name: 'Cartão', value: stats.paymentMethods.cartão, color: '#3b82f6' },
  ].filter(d => d.value > 0);

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
      ['Faturamento Total (Previsto)', formatCurrency(stats.totalRevenue)],
      ['Valor Recebido', formatCurrency(stats.receivedValue)],
      ['Valor a Receber', formatCurrency(stats.toReceiveValue)],
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
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="bg-slate-900 p-2 md:p-3 rounded-2xl shadow-xl shadow-slate-900/10 relative group shrink-0">
            <Logo collapsed className="w-10 h-10 md:w-12 md:h-12" />
            <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm" title="Conexão Segura" />
          </div>
          <div className="min-w-0 flex items-center gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">Olá, NORB!</h2>
              <p className="text-xs md:text-sm text-slate-500 truncate">Aqui está o que está acontecendo hoje.</p>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                <Bell size={20} />
                {inactiveClients.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                    {inactiveClients.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="p-4 border-bottom border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900">Clientes Inativos (+4 meses)</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                      <XCircle size={18} />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {inactiveClients.length === 0 ? (
                      <div className="p-8 text-center text-slate-500">
                        <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500 opacity-20" />
                        <p className="text-sm">Nenhum cliente inativo no momento!</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {inactiveClients.map(client => (
                          <div key={client.id} className="p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{client.name}</h4>
                                <p className="text-xs text-slate-500">Último serviço: {formatDate(client.lastBookingDate)}</p>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => openWhatsApp(client.phone, client.name)}
                                  className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"
                                  title="Chamar no WhatsApp"
                                >
                                  <MessageSquare size={16} />
                                </button>
                                <button 
                                  onClick={() => markAsDone(client.id)}
                                  className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                                  title="Tarefa Realizada"
                                >
                                  <Check size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => setShowValues(!showValues)}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 p-2 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center"
            title={showValues ? "Ocultar valores" : "Mostrar valores"}
          >
            {showValues ? <EyeOff size={18} /> : <Eye size={18} />}
            <span className="ml-2 text-xs font-bold md:hidden">{showValues ? "Ocultar" : "Mostrar"}</span>
          </button>
          <button 
            onClick={generateReport}
            className="flex-1 md:flex-none bg-white border border-slate-200 text-slate-700 px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download size={16} className="mr-2" />
            Relatório
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col lg:flex-row gap-4 items-stretch lg:items-end shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl self-start">
          <button
            onClick={() => setFilterMode('month')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              filterMode === 'month' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setFilterMode('custom')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              filterMode === 'custom' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Personalizado
          </button>
        </div>

        {filterMode === 'month' ? (
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-sm min-w-[200px]">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mês</p>
              <p className="text-sm font-black text-slate-900 capitalize">
                {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
            <button 
              onClick={() => changeMonth(1)}
              disabled={isCurrentMonth}
              className={cn(
                "p-2 rounded-xl transition-colors text-slate-600",
                isCurrentMonth ? "opacity-20 cursor-not-allowed" : "hover:bg-slate-50"
              )}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
            <div className="flex flex-col px-1">
              <span className="text-[8px] font-bold text-slate-400 uppercase">Início</span>
              <input
                type="date"
                value={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 w-28"
              />
            </div>
            <span className="text-slate-300">|</span>
            <div className="flex flex-col px-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-slate-400 uppercase">Fim</span>
                <button 
                  onClick={() => setEndDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="text-[8px] font-bold text-blue-600 hover:text-blue-700 uppercase"
                >
                  Hoje
                </button>
              </div>
              <input
                type="date"
                value={endDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs font-bold text-slate-900 bg-transparent border-none focus:ring-0 p-0 w-28"
              />
            </div>
          </div>
        )}

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
          onClick={() => { 
            setFilterMode('month');
            setSelectedDate(new Date());
            setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
            setEndDate(format(new Date(), 'yyyy-MM-dd'));
            setFilterType(''); 
          }}
          className="text-sm text-blue-900 font-medium hover:underline pb-2"
        >
          Limpar filtros
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-6">
        <StatCard 
          title="Serviços Mês" 
          value={stats.totalMonth} 
          icon={ClipboardList} 
          color="bg-indigo-500" 
          showValue={showValues}
        />
        <StatCard 
          title="Concluídos" 
          value={stats.completed} 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
          showValue={showValues}
        />
        <StatCard 
          title="Agendados" 
          value={stats.scheduled} 
          icon={Calendar} 
          color="bg-blue-500" 
          showValue={showValues}
        />
        <StatCard 
          title="Perdidos" 
          value={stats.lost} 
          icon={XCircle} 
          color="bg-red-500" 
          showValue={showValues}
        />
        <StatCard 
          title="Faturamento" 
          value={formatCurrency(stats.totalRevenue)} 
          icon={TrendingUp} 
          color="bg-slate-900" 
          showValue={showValues}
          subtitle="Concluído + Agendado"
        />
        <StatCard 
          title="Valor Recebido" 
          value={formatCurrency(stats.receivedValue)} 
          icon={DollarSign} 
          color="bg-emerald-600" 
          showValue={showValues}
          subtitle="Apenas concluídos"
        />
        <StatCard 
          title="Valor a Receber" 
          value={formatCurrency(stats.toReceiveValue)} 
          icon={Clock} 
          color="bg-amber-500" 
          showValue={showValues}
          subtitle="Apenas agendados"
        />
        <StatCard 
          title="Gastos" 
          value={formatCurrency(stats.totalExpenses)} 
          icon={ArrowDownRight} 
          color="bg-red-600" 
          showValue={showValues}
        />
        <StatCard 
          title="Lucro" 
          value={formatCurrency(stats.profit)} 
          icon={TrendingUp} 
          color="bg-green-600" 
          showValue={showValues}
          subtitle="Recebido - Gastos"
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
                      const percentage = ((value / (stats.completed || 1)) * 100).toFixed(1);
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

function StatCard({ title, value, icon: Icon, color, showValue = true, subtitle }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4 text-white shadow-lg", color)}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-lg md:text-2xl font-black text-slate-900 truncate">
        {showValue ? value : "••••••"}
      </p>
      {subtitle && (
        <p className="text-[8px] md:text-[10px] text-slate-400 mt-1 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
