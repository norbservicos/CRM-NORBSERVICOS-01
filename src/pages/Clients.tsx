import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  MessageSquare,
  X,
  CheckCircle2
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { Logo } from '../components/Logo';
import { Client } from '../types';
import { cn } from '../utils/utils';

export default function Clients({ store }: { store: ReturnType<typeof useStore> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    gender: 'masculino' as const,
    observations: ''
  });

  const filteredClients = store.clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        name: client.name,
        phone: client.phone,
        address: client.address,
        city: client.city,
        gender: client.gender || 'masculino',
        observations: client.observations || ''
      });
    } else {
      setEditingClient(null);
      setFormData({ name: '', phone: '', address: '', city: '', gender: 'masculino', observations: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      store.updateClient(editingClient.id, formData);
      setShowSuccess(true);
    } else {
      store.addClient(formData);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      store.deleteClient(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
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
            <h4 className="text-xl font-bold mb-4 text-red-600">Excluir Cliente?</h4>
            <p className="text-slate-600 mb-8">Tem certeza que deseja excluir este cliente? Isso removerá permanentemente os dados de contato, mas não afetará o histórico financeiro de serviços já concluídos.</p>
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Clientes</h2>
          <p className="text-slate-500">Gerencie sua base de clientes e contatos.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} className="mr-2" />
          Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por nome ou telefone..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => (
                <tr key={client.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900"><span>{client.name}</span></p>
                    <p className="text-xs text-slate-500 truncate max-w-[200px]"><span>{client.observations || 'Sem observações'}</span></p>
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openWhatsApp(client.phone)}
                      className="flex items-center text-blue-900 hover:text-black font-medium text-sm"
                    >
                      <Phone size={14} className="mr-1" />
                      <span>{client.phone}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-600 text-sm">
                      <MapPin size={14} className="mr-1 shrink-0" />
                      <span className="truncate max-w-[200px]"><span>{client.address}</span>, <span>{client.city}</span></span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(client)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(client.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="bg-slate-100 p-6 rounded-full grayscale opacity-20">
                        <Logo collapsed className="w-16 h-16" />
                      </div>
                      <p className="text-slate-400 italic font-medium">Nenhum cliente encontrado.</p>
                      <button 
                        onClick={() => handleOpenModal()}
                        className="text-blue-900 font-bold hover:underline"
                      >
                        Cadastrar primeiro cliente
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome Completo</label>
                <input 
                  required
                  type="text" 
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">WhatsApp</label>
                <input 
                  required
                  type="text" 
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gênero</label>
                <select 
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value as any})}
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Endereço</label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cidade</label>
                  <input 
                    required
                    type="text" 
                    className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Observações</label>
                <textarea 
                  rows={3}
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.observations}
                  onChange={(e) => setFormData({...formData, observations: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 mt-4"
              >
                {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
