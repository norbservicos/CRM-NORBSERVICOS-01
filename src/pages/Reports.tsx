import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  Star, 
  TrendingUp, 
  Award,
  Calendar,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  Phone,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { formatCurrency, cn } from '../utils/utils';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports({ store }: { store: ReturnType<typeof useStore> }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const stats = useMemo(() => {
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const periodBookings = store.bookings.filter(b => {
      const bDate = new Date(b.date);
      return bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
    });

    const completed = periodBookings.filter(b => b.status === 'concluído');
    
    // Most sold services
    const serviceCounts = store.serviceTypes.map(type => {
      const count = completed.filter(b => b.serviceTypeId === type.id).length;
      const revenue = completed
        .filter(b => b.serviceTypeId === type.id)
        .reduce((acc, b) => acc + b.finalPrice, 0);
      return { ...type, count, revenue };
    }).sort((a, b) => b.count - a.count);

    const totalRevenue = completed.reduce((acc, b) => acc + b.finalPrice, 0);
    const totalClients = store.clients.length;
    const avgValue = completed.length > 0 ? totalRevenue / completed.length : 0;

    // Expenses for the month
    const totalExpenses = store.expenses.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    }).reduce((acc, e) => acc + e.amount, 0);

    const profit = totalRevenue - totalExpenses;

    // Gender breakdown for the month
    let menCount = 0;
    let womenCount = 0;
    periodBookings.forEach(b => {
      const client = store.clients.find(c => c.id === b.clientId);
      if (client?.gender === 'masculino') menCount++;
      else if (client?.gender === 'feminino') womenCount++;
    });

    return { 
      serviceCounts, 
      totalRevenue, 
      totalClients, 
      avgValue, 
      completedCount: completed.length,
      totalMonthBookings: periodBookings.length,
      totalExpenses,
      profit,
      menCount,
      womenCount,
      periodBookings: periodBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [store.bookings, store.serviceTypes, store.clients, store.expenses, selectedDate]);

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    setSelectedDate(newDate);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const periodStr = format(selectedDate, 'MMMM yyyy', { locale: ptBR });
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text(`Relatório - ${periodStr}`, 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 32);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 38, 196, 38);

    // Summary
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumo Geral', 14, 50);
    
    const summaryData = [
      ['Total de Clientes', stats.totalClients.toString()],
      ['Agendamentos no Período', stats.totalMonthBookings.toString()],
      ['Serviços Realizados', stats.completedCount.toString()],
      ['Faturamento Total', formatCurrency(stats.totalRevenue)],
      ['Total de Gastos', formatCurrency(stats.totalExpenses)],
      ['Lucro Líquido', formatCurrency(stats.profit)],
      ['Ticket Médio', formatCurrency(stats.avgValue)],
      ['Clientes Homens', stats.menCount.toString()],
      ['Clientes Mulheres', stats.womenCount.toString()],
    ];

    (doc as any).autoTable({
      startY: 55,
      head: [['Indicador', 'Valor']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] }
    });

    // Services
    doc.text('Desempenho por Serviço', 14, (doc as any).lastAutoTable.finalY + 15);
    
    const serviceData = stats.serviceCounts.map(s => [
      s.name,
      s.count.toString(),
      formatCurrency(s.revenue)
    ]);

    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Serviço', 'Quantidade', 'Faturamento']],
      body: serviceData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] }
    });

    doc.save(`relatorio-${periodStr.replace(' ', '-')}.pdf`);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20 md:pb-0">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Relatórios e Histórico</h2>
          <p className="text-xs md:text-sm text-slate-500">Acompanhe o desempenho e histórico de atendimentos.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 text-center min-w-[120px]">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Período</p>
              <p className="text-sm font-black text-slate-900 capitalize">
                {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
            <button 
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <button 
            onClick={exportPDF}
            className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center transition-all shadow-lg text-sm"
          >
            <Download size={18} className="mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        {/* Top Services */}
        <div className="md:col-span-2 bg-white p-4 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-base md:text-lg font-bold mb-6 flex items-center">
            <Award size={20} className="mr-2 text-amber-500" />
            Serviços Mais Vendidos
          </h3>
          <div className="space-y-6">
            {stats.serviceCounts.length > 0 ? (
              stats.serviceCounts.map((service, index) => (
                <div key={service.id} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">#{index + 1}</span>
                      <p className="text-sm font-bold text-slate-900">{service.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{service.count} vendas</p>
                      <p className="text-[10px] text-blue-900 font-bold">{formatCurrency(service.revenue)}</p>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-900 rounded-full transition-all duration-1000" 
                      style={{ width: `${(service.count / (stats.serviceCounts[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-10 text-sm">Nenhum serviço realizado neste período.</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-6">
          <ReportStat 
            title="Clientes" 
            value={stats.totalClients} 
            icon={Users} 
            color="text-blue-600" 
            bgColor="bg-blue-50" 
          />
          <ReportStat 
            title="Lucro" 
            value={formatCurrency(stats.profit)} 
            icon={TrendingUp} 
            color="text-green-600" 
            bgColor="bg-green-50" 
          />
          <ReportStat 
            title="Gastos" 
            value={formatCurrency(stats.totalExpenses)} 
            icon={ArrowDownRight} 
            color="text-red-600" 
            bgColor="bg-red-50" 
          />
          <ReportStat 
            title="Média" 
            value={formatCurrency(stats.avgValue)} 
            icon={Star} 
            color="text-yellow-600" 
            bgColor="bg-yellow-50" 
          />
        </div>
      </div>

      {/* Detailed History for Follow-up */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base md:text-lg font-bold flex items-center">
            <Calendar size={20} className="mr-2 text-blue-600" />
            Histórico e Follow-up
          </h3>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-full">
            {stats.periodBookings.length} atendimentos
          </span>
        </div>
        
        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Data</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Serviço</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Valor</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.periodBookings.length > 0 ? (
                stats.periodBookings.map(booking => {
                  const client = store.clients.find(c => c.id === booking.clientId);
                  const service = store.serviceTypes.find(s => s.id === booking.serviceTypeId);
                  return (
                    <tr key={booking.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <p className="text-sm font-bold text-slate-900">{format(new Date(booking.date), 'dd/MM/yyyy')}</p>
                        <p className="text-xs text-slate-400">{booking.time}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-xs font-bold text-slate-600">
                            {client?.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{client?.name}</p>
                            <p className="text-xs text-slate-400">{client?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-slate-700">{service?.name}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-black text-slate-900">{formatCurrency(booking.finalPrice)}</span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          booking.status === 'concluído' ? "bg-green-100 text-green-700" :
                          booking.status === 'agendado' ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-50 text-red-700"
                        )}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          {client?.phone && (
                            <a 
                              href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-colors"
                            >
                              <MessageSquare size={18} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-slate-400">
                    Nenhum atendimento registrado para este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {stats.periodBookings.length > 0 ? (
            stats.periodBookings.map(booking => {
              const client = store.clients.find(c => c.id === booking.clientId);
              const service = store.serviceTypes.find(s => s.id === booking.serviceTypeId);
              return (
                <div key={booking.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3 text-xs font-bold text-slate-600">
                        {client?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{client?.name}</p>
                        <p className="text-[10px] text-slate-400">{format(new Date(booking.date), 'dd/MM/yyyy')} • {booking.time}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider",
                      booking.status === 'concluído' ? "bg-green-100 text-green-700" :
                      booking.status === 'agendado' ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-50 text-red-700"
                    )}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                    <span className="text-xs font-medium text-slate-700">{service?.name}</span>
                    <span className="text-sm font-black text-slate-900">{formatCurrency(booking.finalPrice)}</span>
                  </div>
                  {client?.phone && (
                    <div className="flex justify-end pt-1">
                      <a 
                        href={`https://wa.me/55${client.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold"
                      >
                        <MessageSquare size={14} />
                        WhatsApp Follow-up
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400 text-sm">
              Nenhum atendimento registrado para este período.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReportStat({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-3 md:space-x-4">
      <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center shrink-0", bgColor, color)}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">{title}</p>
        <p className="text-sm md:text-xl font-black text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
}
