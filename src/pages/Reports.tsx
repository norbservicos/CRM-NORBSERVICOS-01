import React, { useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Users, 
  Star, 
  TrendingUp, 
  Award,
  Calendar,
  ArrowDownRight
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { formatCurrency, cn } from '../utils/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports({ store }: { store: ReturnType<typeof useStore> }) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthBookings = store.bookings.filter(b => {
      const bDate = new Date(b.date);
      return bDate.getMonth() === currentMonth && bDate.getFullYear() === currentYear;
    });

    const completed = currentMonthBookings.filter(b => b.status === 'concluído');
    
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
    currentMonthBookings.forEach(b => {
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
      totalMonthBookings: currentMonthBookings.length,
      totalExpenses,
      profit,
      menCount,
      womenCount
    };
  }, [store.bookings, store.serviceTypes, store.clients, store.expenses]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('Relatório Executivo - Norb Serviços', 14, 25);
    
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
      ['Agendamentos no Mês', stats.totalMonthBookings.toString()],
      ['Serviços Realizados (Mês)', stats.completedCount.toString()],
      ['Faturamento Total (Mês)', formatCurrency(stats.totalRevenue)],
      ['Total de Gastos (Mês)', formatCurrency(stats.totalExpenses)],
      ['Lucro Líquido (Mês)', formatCurrency(stats.profit)],
      ['Ticket Médio', formatCurrency(stats.avgValue)],
      ['Clientes Homens (Mês)', stats.menCount.toString()],
      ['Clientes Mulheres (Mês)', stats.womenCount.toString()],
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

    doc.save('relatorio-executivo-norb.pdf');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Relatórios Executivos</h2>
          <p className="text-slate-500">Análise detalhada do seu negócio.</p>
        </div>
        <button 
          onClick={exportPDF}
          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center transition-all shadow-lg"
        >
          <Download size={20} className="mr-2" />
          Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Top Services */}
        <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6 flex items-center">
            <Award size={20} className="mr-2 text-amber-500" />
            Serviços Mais Vendidos
          </h3>
          <div className="space-y-6">
            {stats.serviceCounts.map((service, index) => (
              <div key={service.id} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">#{index + 1}</span>
                    <p className="font-bold text-slate-900">{service.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{service.count} vendas</p>
                    <p className="text-xs text-blue-900 font-bold">{formatCurrency(service.revenue)}</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-900 rounded-full transition-all duration-1000" 
                    style={{ width: `${(service.count / (stats.serviceCounts[0]?.count || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-6">
          <ReportStat 
            title="Total de Clientes" 
            value={stats.totalClients} 
            icon={Users} 
            color="text-blue-600" 
            bgColor="bg-blue-50" 
          />
          <ReportStat 
            title="Lucro Mensal" 
            value={formatCurrency(stats.profit)} 
            icon={TrendingUp} 
            color="text-emerald-600" 
            bgColor="bg-emerald-50" 
          />
          <ReportStat 
            title="Gastos Mensais" 
            value={formatCurrency(stats.totalExpenses)} 
            icon={ArrowDownRight} 
            color="text-red-600" 
            bgColor="bg-red-50" 
          />
          <ReportStat 
            title="Média por Serviço" 
            value={formatCurrency(stats.avgValue)} 
            icon={Star} 
            color="text-amber-600" 
            bgColor="bg-amber-50" 
          />
        </div>
      </div>
    </div>
  );
}

function ReportStat({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", bgColor, color)}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}
