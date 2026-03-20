import React, { useState } from 'react';
import { 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Edit2, 
  Trash2,
  MessageSquare,
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Booking, ServiceStatus } from '../types';
import { cn, formatCurrency, formatDate, parseDate } from '../utils/utils';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ServiceList({ store, onEdit }: { store: ReturnType<typeof useStore>, onEdit: (booking: Booking) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [completionConfirm, setCompletionConfirm] = useState<string | null>(null);
  const [lostReasonModal, setLostReasonModal] = useState<{ id: string } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

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

    const client = store.clients.find(c => c.id === b.clientId);
    const service = store.serviceTypes.find(s => s.id === b.serviceTypeId);
    
    const matchesSearch = 
      client?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      service?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ? true : b.status === statusFilter;
    
    return matchesPeriod && matchesSearch && matchesStatus;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isCurrentMonth = isSameMonth(selectedDate, new Date());

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    if (offset > 0 && newDate > new Date()) return;
    setSelectedDate(newDate);
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case 'agendado': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'pendente': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'concluído': return 'bg-green-100 text-green-700 border-green-200';
      case 'cancelado': return 'bg-red-100 text-red-700 border-red-200';
      case 'perdido': return 'bg-slate-200 text-slate-700 border-slate-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const openWhatsApp = (booking: Booking) => {
    const client = store.clients.find(c => c.id === booking.clientId);
    if (!client) return;
    const cleanPhone = client.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      store.deleteBooking(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const handleStatusUpdate = (id: string, status: ServiceStatus) => {
    if (status === 'perdido') {
      setLostReasonModal({ id });
      return;
    }
    if (status === 'concluído') {
      setCompletionConfirm(id);
      return;
    }
    store.updateBooking(id, { status });
    setShowSuccess(true);
  };

  const confirmCompletion = () => {
    if (completionConfirm) {
      store.updateBooking(completionConfirm, { status: 'concluído' });
      setCompletionConfirm(null);
      setShowSuccess(true);
    }
  };

  const submitLostReason = () => {
    if (lostReasonModal) {
      store.updateBooking(lostReasonModal.id, { status: 'perdido', lostReason });
      setLostReasonModal(null);
      setLostReason('');
      setShowSuccess(true);
    }
  };

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold mb-2 text-slate-900">Sucesso!</h4>
            <p className="text-slate-600 mb-8">Atualização realizada com sucesso.</p>
            <button 
              onClick={() => setShowSuccess(false)}
              className="w-full px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h4 className="text-xl font-bold mb-4 text-red-600">Excluir Agendamento?</h4>
            <p className="text-slate-600 mb-8">Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita e afetará os relatórios financeiros.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {completionConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 relative text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center mb-6 mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold mb-4 text-slate-900">Concluir Serviço?</h4>
            <p className="text-slate-600 mb-8">Uma vez que o serviço é marcado como concluído, ele não poderá mais ser alterado. Deseja continuar?</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setCompletionConfirm(null)}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmCompletion}
                className="flex-1 px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {lostReasonModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
              <XCircle size={32} />
            </div>
            <h4 className="text-xl font-bold mb-4 text-slate-900">Motivo da Perda</h4>
            <p className="text-slate-600 mb-4 text-sm">Por favor, descreva por que este serviço foi perdido (ex: cliente desistiu, preço alto, etc).</p>
            <textarea 
              rows={4}
              className="w-full rounded-2xl border-slate-200 focus:ring-blue-900 focus:border-blue-900 mb-6 text-left"
              placeholder="Digite o motivo aqui..."
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
            />
            <div className="flex gap-4">
              <button 
                onClick={() => { setLostReasonModal(null); setLostReason(''); }}
                className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={!lostReason.trim()}
                onClick={submitLostReason}
                className="flex-1 px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                Salvar Motivo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Lista de Serviços</h2>
          <p className="text-xs md:text-sm text-slate-500">Acompanhe todos os agendamentos e status.</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterMode('month')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all",
              filterMode === 'month' ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setFilterMode('custom')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all",
              filterMode === 'custom' ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Personalizado
          </button>
        </div>
      </div>

      {filterMode === 'month' ? (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-sm font-black text-blue-900 uppercase tracking-widest">
              {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            {isCurrentMonth && (
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">Mês Atual</span>
            )}
          </div>

          <button 
            onClick={() => changeMonth(1)}
            disabled={isCurrentMonth}
            className={cn(
              "p-2 rounded-full transition-colors",
              isCurrentMonth ? "text-slate-300 cursor-not-allowed" : "hover:bg-slate-100 text-slate-600"
            )}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data Inicial</label>
            <input 
              type="date" 
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900"
              value={startDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Data Final</label>
              <button 
                onClick={() => setEndDate(new Date().toISOString().split('T')[0])}
                className="text-[10px] font-bold text-blue-900 hover:underline uppercase"
              >
                Hoje
              </button>
            </div>
            <input 
              type="date" 
              className="w-full rounded-xl border-slate-200 text-sm focus:ring-blue-900 focus:border-blue-900"
              value={endDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por cliente ou serviço..." 
            className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <Filter size={18} className="text-slate-400 shrink-0" />
            <select 
              className="flex-1 sm:flex-none rounded-xl border-slate-200 text-xs focus:ring-blue-900 focus:border-blue-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos os Status</option>
              <option value="agendado">Agendados</option>
              <option value="concluído">Concluídos</option>
              <option value="perdido">Perdidos</option>
            </select>
          </div>
          <button 
            onClick={() => {
              setFilterMode('month');
              setSelectedDate(new Date());
              setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
              setEndDate(format(new Date(), 'yyyy-MM-dd'));
              setStatusFilter('all');
              setSearchTerm('');
            }}
            className="text-sm text-blue-900 font-medium hover:underline whitespace-nowrap"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBookings.map(booking => {
          const client = store.clients.find(c => c.id === booking.clientId);
          const service = store.serviceTypes.find(s => s.id === booking.serviceTypeId);
          
          return (
            <div key={booking.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
              <div className="p-6 space-y-4 flex-1">
                <div className="flex justify-between items-start">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                    getStatusColor(booking.status)
                  )}>
                    <span>{booking.status}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Data e Hora</p>
                    <p className="text-sm font-bold text-slate-900"><span>{formatDate(booking.date)}</span> • <span>{booking.time}</span></p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900"><span>{client?.name || 'Cliente Removido'}</span></h3>
                  <p className="text-sm font-medium text-blue-900"><span>{service?.name}</span></p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center text-xs text-slate-500">
                    <Phone size={14} className="mr-2 shrink-0" />
                    <span>{client?.phone}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <MapPin size={14} className="mr-2 shrink-0" />
                    <span className="truncate">{client?.address}, {client?.city}</span>
                  </div>
                  {booking.status === 'perdido' && booking.lostReason && (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 mt-2">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Motivo da Perda</p>
                      <p className="text-xs text-red-800 italic">"{booking.lostReason}"</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 p-3 rounded-2xl space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>Valor Original</span>
                    <span>{formatCurrency(booking.originalPrice)}</span>
                  </div>
                  {booking.discount > 0 && (
                    <div className="flex justify-between text-[10px] font-bold text-red-400 uppercase tracking-wider">
                      <span>Desconto</span>
                      <span>-<span>{formatCurrency(booking.discount)}</span></span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                    <span>Total</span>
                    <span><span>{formatCurrency(booking.finalPrice)}</span></span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 gap-2">
                {booking.status !== 'concluído' && booking.status !== 'cancelado' && (
                  <button 
                    onClick={() => handleStatusUpdate(booking.id, 'concluído')}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-blue-900 text-white text-xs font-bold hover:bg-black transition-colors"
                  >
                    <CheckCircle2 size={14} className="mr-1" />
                    Concluir
                  </button>
                )}
                <button 
                  onClick={() => openWhatsApp(booking)}
                  className="flex items-center justify-center py-2 px-3 rounded-xl bg-white border border-slate-200 text-blue-900 text-xs font-bold hover:bg-blue-50 transition-colors"
                >
                  <MessageSquare size={14} className="mr-1" />
                  WhatsApp
                </button>
                {booking.status !== 'perdido' && booking.status !== 'concluído' && (
                  <button 
                    onClick={() => handleStatusUpdate(booking.id, 'perdido')}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-white border border-slate-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={14} className="mr-1" />
                    Perdido
                  </button>
                )}
                <button 
                  onClick={() => onEdit(booking)}
                  className="flex items-center justify-center py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  <Edit2 size={14} className="mr-1" />
                  Editar
                </button>
                {booking.status !== 'concluído' && (
                  <button 
                    onClick={() => setDeleteConfirm(booking.id)}
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-white border border-slate-200 text-red-500 text-xs font-bold hover:bg-red-50 transition-colors col-span-2"
                  >
                    <Trash2 size={14} className="mr-1" />
                    Excluir Agendamento
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredBookings.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <ClipboardList size={32} />
            </div>
            <p className="text-slate-400 italic">Nenhum serviço encontrado com estes filtros.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ClipboardList({ size }: any) {
  return <Calendar size={size} />;
}
