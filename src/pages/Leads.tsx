import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  Armchair, 
  Clock, 
  FileText, 
  MessageSquare, 
  Trash2, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  X, 
  Calendar, 
  ArrowRight,
  Filter,
  Users
} from 'lucide-react';
import { Lead, LeadStatus } from '../types';

interface LeadsProps {
  store: {
    leads: Lead[];
    addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => Promise<Lead | undefined>;
    updateLead: (id: string, lead: Partial<Lead>) => Promise<void>;
    deleteLead: (id: string) => Promise<void>;
    convertLeadToClient: (lead: Lead) => Promise<any>;
  };
  onNavigateToBooking?: () => void;
}

export default function Leads({ store, onNavigateToBooking }: LeadsProps) {
  const { leads, addLead, updateLead, deleteLead, convertLeadToClient } = store;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    whatsappNumber: '',
    selectedCity: '',
    selectedFurniture: '',
    notes: '',
    status: 'novo' as LeadStatus,
    source: 'Manual'
  });

  const handleOpenAddModal = () => {
    setFormData({
      fullName: '',
      whatsappNumber: '',
      selectedCity: '',
      selectedFurniture: '',
      notes: '',
      status: 'novo',
      source: 'Manual'
    });
    setEditingLead(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      fullName: lead.fullName || '',
      whatsappNumber: lead.whatsappNumber || '',
      selectedCity: lead.selectedCity || '',
      selectedFurniture: lead.selectedFurniture || '',
      notes: lead.notes || '',
      status: lead.status || 'novo',
      source: lead.source || 'Formulário'
    });
    setIsAddModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.whatsappNumber.trim()) return;

    if (editingLead) {
      await updateLead(editingLead.id, formData);
    } else {
      await addLead(formData);
    }

    setIsAddModalOpen(false);
    setEditingLead(null);
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    await updateLead(leadId, { status: newStatus });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      await deleteLead(id);
    }
  };

  const handleConvert = async (lead: Lead) => {
    await convertLeadToClient(lead);
    if (onNavigateToBooking) {
      onNavigateToBooking();
    }
  };

  const formatPhoneNumber = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return num;
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'novo':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Novo Lead</span>;
      case 'em_atendimento':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Em Atendimento</span>;
      case 'convertido':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200"><CheckCircle2 className="w-3.5 h-3.5" /> Convertido</span>;
      case 'perdido':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Perdido</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">{status}</span>;
    }
  };

  // Filter Leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.whatsappNumber || '').includes(search) ||
      (lead.selectedCity || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.selectedFurniture || '').toLowerCase().includes(search.toLowerCase()) ||
      (lead.notes || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'todos' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalLeads = leads.length;
  const newLeadsCount = leads.filter(l => l.status === 'novo').length;
  const inProgressCount = leads.filter(l => l.status === 'em_atendimento').length;
  const convertedCount = leads.filter(l => l.status === 'convertido').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <UserPlus className="w-7 h-7 text-blue-900" />
            <h1 className="text-2xl font-bold text-slate-900">Gerenciador de Leads</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Receba solicitações de clientes em tempo real direto da sua Landing Page ou adicione manualmente.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-slate-900 text-white font-medium rounded-xl transition-all shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Novo Lead</span>
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Leads</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalLeads}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Novos Leads</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{newLeadsCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-sm">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Em Atendimento</p>
          <p className="text-2xl font-bold text-amber-700 mt-2">{inProgressCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-sm">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Convertidos</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">{convertedCount}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade, móvel, telefone ou nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'novo', label: 'Novos' },
            { id: 'em_atendimento', label: 'Atendimento' },
            { id: 'convertido', label: 'Convertidos' },
            { id: 'perdido', label: 'Perdidos' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Grid */}
      {filteredLeads.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Nenhum lead encontrado</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {search || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros ou os termos de busca.'
              : 'As solicitações enviadas pelo formulário da sua Landing Page aparecerão automaticamente aqui.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLeads.map(lead => {
            const cleanPhone = (lead.whatsappNumber || '').replace(/\D/g, '');
            const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}?text=Olá%20${encodeURIComponent(lead.fullName || '')},%20recebemos%20sua%20solicitação%20no%20nosso%20site!` : '#';

            return (
              <div 
                key={lead.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {lead.fullName || 'Sem Nome'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDateTime(lead.createdAt)}</span>
                      </div>
                    </div>
                    {getStatusBadge(lead.status)}
                  </div>

                  {/* Consumed Information Details */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 text-sm">
                    {/* WhatsApp */}
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-xs text-slate-500 uppercase">WhatsApp:</span>
                      </div>
                      <span className="font-semibold font-mono text-slate-900">
                        {lead.whatsappNumber ? formatPhoneNumber(lead.whatsappNumber) : 'Não informado'}
                      </span>
                    </div>

                    {/* Cidade */}
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-xs text-slate-500 uppercase">Cidade:</span>
                      </div>
                      <span className="font-semibold text-slate-900">
                        {lead.selectedCity || 'Não informada'}
                      </span>
                    </div>

                    {/* Móvel/Estofado */}
                    <div className="flex items-center justify-between text-slate-700">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Armchair className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-xs text-slate-500 uppercase">Móvel/Estofado:</span>
                      </div>
                      <span className="font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 text-xs">
                        {lead.selectedFurniture || 'Não informado'}
                      </span>
                    </div>

                    {/* Observações / Notes */}
                    {lead.notes && (
                      <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>Notas / Mensagem:</span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{lead.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2">
                  {/* Status Selector */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">Mudar Status:</span>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as LeadStatus)}
                      className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="novo">Novo</option>
                      <option value="em_atendimento">Em Atendimento</option>
                      <option value="convertido">Convertido</option>
                      <option value="perdido">Perdido</option>
                    </select>
                  </div>

                  {/* Primary Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {cleanPhone ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button disabled className="px-3 py-2 bg-slate-200 text-slate-400 rounded-xl text-xs font-semibold cursor-not-allowed">
                        Sem WhatsApp
                      </button>
                    )}

                    <button
                      onClick={() => handleConvert(lead)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                      title="Converter em Cliente e Criar Agendamento"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Agendar</span>
                    </button>
                  </div>

                  {/* Edit / Delete Footer */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 text-slate-400">
                    <button
                      onClick={() => handleOpenEditModal(lead)}
                      className="p-1.5 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar Lead"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
                      className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">
                {editingLead ? 'Editar Lead' : 'Adicionar Novo Lead'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ex: Guilherme Santos"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="text"
                  required
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="(11) 99999-8888"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.selectedCity}
                    onChange={(e) => setFormData({ ...formData, selectedCity: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Móvel / Estofado
                  </label>
                  <input
                    type="text"
                    value={formData.selectedFurniture}
                    onChange={(e) => setFormData({ ...formData, selectedFurniture: e.target.value })}
                    placeholder="Ex: Sofá 3 lugares"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                >
                  <option value="novo">Novo</option>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="convertido">Convertido</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Observações / Notas
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Detalhes sobre o móvel, manchas, urgência..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-900 hover:bg-slate-900 text-white font-medium rounded-xl transition-all text-sm shadow-sm"
                >
                  {editingLead ? 'Salvar Alterações' : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
