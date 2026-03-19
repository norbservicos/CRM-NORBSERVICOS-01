import React, { useState } from 'react';
import { 
  Plus, 
  Settings, 
  Clock, 
  DollarSign, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { Logo } from '../components/Logo';
import { ServiceType } from '../types';
import { cn, formatCurrency } from '../utils/utils';

export default function Catalog({ store }: { store: ReturnType<typeof useStore> }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    defaultPrice: 0,
    estimatedTime: '01:00',
    active: true
  });

  const handleOpenModal = (service?: ServiceType) => {
    setError(null);
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
        defaultPrice: service.defaultPrice || 0,
        estimatedTime: service.estimatedTime || '01:00',
        active: service.active
      });
    } else {
      setEditingService(null);
      setFormData({ name: '', description: '', defaultPrice: 0, estimatedTime: '01:00', active: true });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingService) {
        await store.updateServiceType(editingService.id, formData);
        setShowSuccess(true);
      } else {
        await store.addServiceType(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.message === 'SERVICE_EXISTS') {
        setError('Este serviço já está cadastrado no catálogo.');
      } else {
        setError('Ocorreu um erro ao salvar o serviço.');
      }
    }
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      store.deleteServiceType(deleteConfirm);
      setDeleteConfirm(null);
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
            <h4 className="text-xl font-bold mb-4 text-red-600">Excluir Serviço?</h4>
            <p className="text-slate-600 mb-8">Tem certeza que deseja excluir este tipo de serviço? Isso não afetará agendamentos já realizados, mas o serviço não poderá mais ser selecionado para novos agendamentos.</p>
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
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">Catálogo de Serviços</h2>
          <p className="text-xs md:text-sm text-slate-500">Defina os serviços e preços padrão da sua empresa.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center transition-all shadow-lg shadow-blue-900/20 w-full sm:w-auto"
        >
          <Plus size={20} className="mr-2" />
          Novo Serviço
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {store.serviceTypes.map(service => (
          <div key={service.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
            {/* ... existing card content ... */}
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                service.active ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-500"
              )}>
                <span>{service.active ? 'Ativo' : 'Inativo'}</span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleOpenModal(service)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="Editar"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => setDeleteConfirm(service.id)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2"><span>{service.name}</span></h3>
            <p className="text-sm text-slate-500 mb-6 line-clamp-2 h-10"><span>{service.description}</span></p>
          </div>
        ))}
        {store.serviceTypes.length === 0 && (
          <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-4">
            <div className="bg-slate-50 p-6 rounded-full grayscale opacity-20">
              <Logo collapsed className="w-16 h-16" />
            </div>
            <p className="text-slate-400 italic font-medium">Nenhum serviço cadastrado no catálogo.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="text-blue-900 font-bold hover:underline"
            >
              Adicionar primeiro serviço
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nome do Serviço</label>
                <input 
                  required
                  type="text" 
                  placeholder="Ex: Limpeza de Sofá"
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Descreva o que está incluso no serviço..."
                  className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Preço Base (R$)</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.defaultPrice}
                    onChange={(e) => setFormData({...formData, defaultPrice: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Estimado</label>
                  <input 
                    required
                    type="time" 
                    className="w-full rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData({...formData, estimatedTime: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-3 pt-2">
                <input 
                  type="checkbox" 
                  id="active"
                  className="rounded text-blue-900 focus:ring-blue-900"
                  checked={formData.active}
                  onChange={(e) => setFormData({...formData, active: e.target.checked})}
                />
                <label htmlFor="active" className="text-sm font-medium text-slate-700">Serviço Ativo</label>
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 mt-4"
              >
                {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
