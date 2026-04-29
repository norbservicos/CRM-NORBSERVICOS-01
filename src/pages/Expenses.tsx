import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  DollarSign, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  Calendar,
  Tag,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { Logo } from '../components/Logo';
import { Expense, ExpenseCategory } from '../types';
import { cn, formatCurrency, parseDate } from '../utils/utils';
import { format, startOfMonth, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Expenses({ store }: { store: ReturnType<typeof useStore> }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    category: 'operacional' as ExpenseCategory,
    date: new Date().toISOString().split('T')[0]
  });

  const filteredExpenses = store.expenses.filter(e => {
    const eDate = parseDate(e.date);
    
    let matchesPeriod = false;
    if (filterMode === 'month') {
      const currentMonth = selectedDate.getMonth();
      const currentYear = selectedDate.getFullYear();
      matchesPeriod = eDate.getMonth() === currentMonth && eDate.getFullYear() === currentYear;
    } else {
      const start = parseDate(startDate);
      const end = parseDate(endDate);
      matchesPeriod = eDate >= start && eDate <= end;
    }

    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         e.category.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesPeriod && matchesSearch;
  }).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  const isCurrentMonth = isSameMonth(selectedDate, new Date());

  const changeMonth = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + offset);
    if (offset > 0 && newDate > new Date()) return;
    setSelectedDate(newDate);
  };

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
      });
    } else {
      setEditingExpense(null);
      setFormData({ 
        description: '', 
        amount: 0, 
        category: 'operacional', 
        date: new Date().toISOString().split('T')[0] 
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExpense) {
      store.updateExpense(editingExpense.id, formData);
      setShowSuccess(true);
    } else {
      store.addExpense(formData);
    }
    setIsModalOpen(false);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      store.deleteExpense(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const categories: { value: ExpenseCategory; label: string }[] = [
    { value: 'investimento', label: 'Investimento' },
    { value: 'operacional', label: 'Operacional' },
    { value: 'manutenção', label: 'Manutenção' },
    { value: 'outro', label: 'Outro' }
  ];

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in duration-200 text-center">
            <div className="w-16 h-16 bg-blue-100 text-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h4 className="text-xl font-bold mb-2 text-slate-900">Sucesso!</h4>
            <p className="text-slate-600 mb-8">Gasto atualizado com sucesso.</p>
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
            <h4 className="text-xl font-bold mb-4 text-red-600">Excluir Gasto?</h4>
            <p className="text-slate-600 mb-8">Tem certeza que deseja excluir este registro de gasto? Esta ação não pode ser desfeita.</p>
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
          <h2 className="text-2xl font-bold text-slate-900">Gastos</h2>
          <p className="text-slate-500">Registre e gerencie as despesas da sua empresa.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus size={20} className="mr-2" />
          Novo Gasto
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-slate-50/50">
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

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar por descrição ou categoria..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { 
              setFilterMode('month');
              setSelectedDate(new Date());
              setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
              setEndDate(format(new Date(), 'yyyy-MM-dd'));
              setSearchTerm(''); 
            }}
            className="text-sm text-blue-900 font-medium hover:underline whitespace-nowrap"
          >
            Limpar filtros
          </button>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-slate-600 text-sm">
                      <Calendar size={14} className="mr-2 text-slate-400" />
                      {parseDate(expense.date).toLocaleDateString('pt-BR')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{expense.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Tag size={14} className="mr-2 text-blue-900" />
                      <span className="text-sm capitalize text-slate-600">{expense.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(expense)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(expense.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredExpenses.map(expense => (
            <div key={expense.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-900"><span>{expense.description}</span></p>
                  <div className="flex items-center mt-1">
                    <Tag size={12} className="mr-1 text-blue-900" />
                    <span className="text-[10px] capitalize text-slate-500 font-bold uppercase tracking-wider">{expense.category}</span>
                  </div>
                </div>
                <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <div className="flex items-center text-slate-500 text-xs">
                  <Calendar size={14} className="mr-1 text-slate-400" />
                  {parseDate(expense.date).toLocaleDateString('pt-BR')}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(expense)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-100"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm(expense.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all border border-slate-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-slate-100 p-6 rounded-full grayscale opacity-20">
                <Logo collapsed className="w-16 h-16" />
              </div>
              <p className="text-slate-400 italic font-medium">Nenhum gasto registrado.</p>
              <button 
                onClick={() => handleOpenModal()}
                className="text-blue-900 font-bold hover:underline"
              >
                Registrar primeiro gasto
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {editingExpense ? 'Editar Gasto' : 'Novo Gasto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Descrição / Motivo</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Compra de produtos de limpeza"
                    className="w-full pl-10 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="number" 
                      step="0.01"
                      className="w-full pl-10 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Data</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      type="date" 
                      className="w-full pl-10 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    className="w-full pl-10 rounded-xl border-slate-200 focus:ring-blue-900 focus:border-blue-900"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-blue-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-900/20 mt-4"
              >
                {editingExpense ? 'Salvar Alterações' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
