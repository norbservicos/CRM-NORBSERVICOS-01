import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  DollarSign, 
  Tag, 
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  UserPlus,
  XCircle
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import type { Client, ServiceType, Booking } from '../types';
import { cn, formatCurrency } from '../utils/utils';

interface BookingFormProps {
  store: ReturnType<typeof useStore>;
  setActiveTab: (tab: any) => void;
  editingBooking?: Booking | null;
  setEditingBooking?: (booking: Booking | null) => void;
}

export default function BookingForm({ store, setActiveTab, editingBooking, setEditingBooking }: BookingFormProps) {
  const [step, setStep] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState(editingBooking?.clientId || '');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState(editingBooking?.serviceTypeId || '');
  const [date, setDate] = useState(editingBooking?.date || '');
  const [time, setTime] = useState(editingBooking?.time || '');
  const [discount, setDiscount] = useState(editingBooking?.discount || 0);
  const [coupon, setCoupon] = useState(editingBooking?.coupon || '');
  const [observations, setObservations] = useState(editingBooking?.observations || '');
  const [paymentMethod, setPaymentMethod] = useState<any>(editingBooking?.paymentMethod || 'pix');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', address: '', city: '', gender: 'masculino' as const });

  useEffect(() => {
    if (editingBooking) {
      setSelectedClientId(editingBooking.clientId);
      setSelectedServiceId(editingBooking.serviceTypeId);
      setDate(editingBooking.date);
      setTime(editingBooking.time);
      setDiscount(editingBooking.discount);
      setCoupon(editingBooking.coupon);
      setObservations(editingBooking.observations || '');
      setPaymentMethod(editingBooking.paymentMethod || 'pix');
      setStep(3); // Go straight to summary if editing
    }
  }, [editingBooking]);

  const filteredClients = store.clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || 
    c.phone.includes(clientSearch)
  );

  const selectedService = useMemo(() => 
    store.serviceTypes.find(s => s.id === selectedServiceId),
  [selectedServiceId, store.serviceTypes]);

  const finalPrice = useMemo(() => {
    if (!selectedService) return 0;
    let price = selectedService.defaultPrice - discount;
    if (coupon.toUpperCase() === 'NORB10') price *= 0.9;
    return Math.max(0, price);
  }, [selectedService, discount, coupon]);

  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error', onConfirm?: () => void } | null>(null);

  const handleCreateBooking = async () => {
    let clientId = selectedClientId;

    if (showNewClientForm) {
      const createdClient = await store.addClient(newClient);
      if (createdClient) {
        clientId = createdClient.id;
      }
    }

    if (!clientId || !selectedServiceId || !date || !time || !observations) {
      setNotification({ message: 'Por favor, preencha todos os campos obrigatórios.', type: 'error' });
      return;
    }

    const bookingData = {
      clientId,
      serviceTypeId: selectedServiceId,
      date,
      time,
      originalPrice: selectedService?.defaultPrice || 0,
      discount,
      coupon,
      finalPrice,
      status: editingBooking?.status || 'agendado',
      paymentMethod,
      observations
    };

    if (editingBooking) {
      await store.updateBooking(editingBooking.id, bookingData);
    } else {
      await store.addBooking(bookingData);
    }

    // Generate WhatsApp message
    const client = store.clients.find(c => c.id === clientId) || (showNewClientForm ? newClient : null);
    const service = store.serviceTypes.find(s => s.id === selectedServiceId);
    
    if (client && service) {
      const message = `Olá ${client.name}, seu serviço de ${service.name} foi ${editingBooking ? 'atualizado' : 'agendado'} para o dia ${new Date(date).toLocaleDateString('pt-BR')} às ${time}. Qualquer dúvida estamos à disposição. NORB Gestão Pro.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/55${client.phone.replace(/\D/g, '')}?text=${encodedMessage}`;
      
      setNotification({
        message: editingBooking ? 'Atualização realizada com sucesso.' : 'Agendamento criado com sucesso! Deseja enviar a confirmação por WhatsApp agora?',
        type: 'success',
        onConfirm: () => {
          if (!editingBooking) {
            window.open(whatsappUrl, '_blank');
          }
          if (setEditingBooking) setEditingBooking(null);
          setActiveTab('services');
        }
      });
    } else {
      if (setEditingBooking) setEditingBooking(null);
      setActiveTab('services');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {notification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mb-6 mx-auto",
              notification.type === 'error' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-900"
            )}>
              {notification.type === 'error' ? <XCircle size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h4 className={cn("text-xl font-bold mb-4", notification.type === 'error' ? "text-red-600" : "text-blue-900")}>
              {notification.type === 'error' ? 'Ops!' : 'Sucesso!'}
            </h4>
            <p className="text-slate-600 mb-8">{notification.message}</p>
            <div className="flex gap-4">
              {notification.onConfirm ? (
                <>
                  {!editingBooking && (
                    <button 
                      onClick={() => { setNotification(null); if (setEditingBooking) setEditingBooking(null); setActiveTab('services'); }}
                      className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
                    >
                      Agora não
                    </button>
                  )}
                  <button 
                    onClick={() => { notification.onConfirm?.(); setNotification(null); }}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
                  >
                    {editingBooking ? 'OK' : 'Enviar WhatsApp'}
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setNotification(null)}
                  className="w-full px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
                >
                  Entendido
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-slate-900">{editingBooking ? 'Editar Agendamento' : 'Novo Agendamento'}</h2>
        <p className="text-slate-500">{editingBooking ? 'Altere as informações do serviço selecionado.' : 'Siga os passos para registrar um novo serviço.'}</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
              step >= s ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20" : "bg-slate-200 text-slate-500"
            )}>
              <span>{s}</span>
            </div>
            {s < 3 && <div className={cn("h-1 w-12 rounded-full", step > s ? "bg-blue-900" : "bg-slate-200")} />}
          </React.Fragment>
        ))}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">1. Selecionar Cliente</h3>
              <button 
                onClick={() => setShowNewClientForm(!showNewClientForm)}
                className="text-blue-900 font-bold text-sm flex items-center hover:underline"
              >
                <span>{showNewClientForm ? 'Buscar cliente existente' : 'Cadastrar novo cliente'}</span>
              </button>
            </div>

            {showNewClientForm ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input 
                  placeholder="Nome completo" 
                  className="rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                />
                <input 
                  placeholder="WhatsApp" 
                  className="rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                />
                <input 
                  placeholder="Endereço" 
                  className="rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                />
                <input 
                  placeholder="Cidade" 
                  className="rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={newClient.city}
                  onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                />
                <select 
                  className="rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={newClient.gender}
                  onChange={(e) => setNewClient({...newClient, gender: e.target.value as any})}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar cliente..." 
                    className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                  {filteredClients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={cn(
                        "p-4 rounded-2xl border text-left transition-all",
                        selectedClientId === client.id 
                          ? "border-blue-900 bg-blue-50 ring-1 ring-blue-900" 
                          : "border-slate-100 hover:border-slate-300 bg-slate-50/50"
                      )}
                    >
                      <p className="font-bold text-slate-900">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.phone}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold">2. Selecionar Serviço</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {store.serviceTypes.filter(s => s.active).map(service => (
                <button
                  key={service.id}
                  onClick={() => setSelectedServiceId(service.id)}
                  className={cn(
                    "p-5 rounded-3xl border text-left transition-all relative group",
                    selectedServiceId === service.id 
                      ? "border-blue-900 bg-blue-50 ring-1 ring-blue-900" 
                      : "border-slate-100 hover:border-slate-300 bg-slate-50/50"
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-bold text-slate-900"><span>{service.name}</span></p>
                    <p className="text-sm font-bold text-blue-900"><span>{formatCurrency(service.defaultPrice)}</span></p>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2">{service.description}</p>
                  <div className="mt-3 flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <Clock size={12} className="mr-1" />
                    <span>{service.estimatedTime}</span>h estimado
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h3 className="text-xl font-bold">3. Detalhes e Pagamento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data *</label>
                    <input 
                      type="date" 
                      className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Horário *</label>
                    <input 
                      type="time" 
                      className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Forma de Pagamento *</label>
                    <select 
                      className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <option value="pix">PIX</option>
                      <option value="dinheiro">Dinheiro</option>
                      <option value="cartão">Cartão</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalhes do Serviço *</label>
                  <textarea 
                    rows={3}
                    placeholder="Descreva os detalhes do serviço..."
                    className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-slate-900 flex items-center">
                  <DollarSign size={18} className="mr-2 text-blue-900" />
                  Resumo Financeiro
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Valor Original</span>
                    <span className="font-medium"><span>{formatCurrency(selectedService?.defaultPrice || 0)}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      placeholder="Desconto manual (R$)"
                      className="flex-1 text-xs rounded-lg border-slate-200"
                      value={discount || ''}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    />
                    <input 
                      type="text" 
                      placeholder="Cupom"
                      className="flex-1 text-xs rounded-lg border-slate-200"
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                    />
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-red-500">
                      <span>Desconto Aplicado</span>
                      <span>-<span>{formatCurrency(discount)}</span></span>
                    </div>
                  )}
                  {coupon.toUpperCase() === 'NORB10' && (
                    <div className="flex justify-between text-sm text-blue-900">
                      <span>Cupom NORB10 (10%)</span>
                      <span>-10%</span>
                    </div>
                  )}
                  <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                    <span className="font-bold text-slate-900">Total Final</span>
                    <span className="text-2xl font-black text-blue-900"><span>{formatCurrency(finalPrice)}</span></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 flex items-center justify-between">
          <button
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className={cn(
              "px-6 py-3 rounded-2xl font-bold transition-all",
              step === 1 ? "text-slate-300 cursor-not-allowed" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Voltar
          </button>
          
          {step < 3 ? (
            <button
              disabled={(step === 1 && !selectedClientId && !showNewClientForm) || (step === 2 && !selectedServiceId)}
              onClick={() => setStep(step + 1)}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo Passo
              <ArrowRight size={18} className="ml-2" />
            </button>
          ) : (
            <button
              disabled={!date || !time || !observations}
              onClick={handleCreateBooking}
              className="bg-blue-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-bold flex items-center transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={18} className="mr-2" />
              Finalizar Agendamento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
