import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  FileText, 
  Menu, 
  X,
  PlusCircle,
  Search
} from 'lucide-react';
import { cn } from './utils/utils';
import { Logo } from './components/Logo';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Catalog from './pages/Catalog';
import BookingForm from './pages/BookingForm';
import ServiceList from './pages/ServiceList';
import Agenda from './pages/Agenda';
import Finance from './pages/Finance';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import { Client, ServiceType, Booking } from './types';
import { useStore } from './hooks/useStore';

type Tab = 'dashboard' | 'clients' | 'catalog' | 'booking' | 'services' | 'agenda' | 'finance' | 'reports' | 'expenses';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const store = useStore();

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setActiveTab('booking');
  };

  const handleNewBooking = () => {
    setEditingBooking(null);
    setActiveTab('booking');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'catalog', label: 'Catálogo', icon: Settings },
    { id: 'booking', label: 'Novo Agendamento', icon: PlusCircle, onClick: handleNewBooking },
    { id: 'services', label: 'Serviços', icon: ClipboardList },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'finance', label: 'Financeiro', icon: DollarSign },
    { id: 'expenses', label: 'Gastos', icon: DollarSign },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const renderContent = () => {
    try {
      switch (activeTab) {
        case 'dashboard': return <Dashboard store={store} setActiveTab={setActiveTab} />;
        case 'clients': return <Clients store={store} />;
        case 'catalog': return <Catalog store={store} />;
        case 'booking': return <BookingForm store={store} setActiveTab={setActiveTab} editingBooking={editingBooking} setEditingBooking={setEditingBooking} />;
        case 'services': return <ServiceList store={store} onEdit={handleEditBooking} />;
        case 'agenda': return <Agenda store={store} />;
        case 'finance': return <Finance store={store} />;
        case 'expenses': return <Expenses store={store} />;
        case 'reports': return <Reports store={store} />;
        default: return <Dashboard store={store} setActiveTab={setActiveTab} />;
      }
    } catch (error) {
      console.error('Render error:', error);
      return <div className="p-8 text-red-500">Erro ao carregar módulo: {String(error)}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-900 text-white transition-all duration-300 flex flex-col fixed h-full z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className={cn("p-6 flex items-center justify-between", !isSidebarOpen && "px-0 justify-center")}>
          <Logo collapsed={!isSidebarOpen} />
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="mx-auto mb-6 p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
        )}

        <nav className="flex-1 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.onClick) item.onClick();
                else setActiveTab(item.id as Tab);
              }}
              className={cn(
                "w-full flex items-center p-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "group-hover:text-white")} />
              {isSidebarOpen && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={cn("flex items-center", isSidebarOpen ? "space-x-3" : "justify-center")}>
            <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center font-bold text-xs">NS</div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">Admin Norb</p>
                <p className="text-xs text-slate-400 truncate">contato@norb.com</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        isSidebarOpen ? "ml-64" : "ml-20"
      )}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            {!isSidebarOpen && <Logo collapsed className="scale-75 origin-left" />}
            <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 w-96">
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Busca global (clientes, serviços...)" 
                className="bg-transparent border-none focus:ring-0 ml-2 w-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Serviços hoje</p>
              <p className="text-lg font-bold text-slate-900">
                {store.bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <button 
              onClick={handleNewBooking}
              className="bg-blue-900 hover:bg-black text-white px-4 py-2 rounded-xl font-medium flex items-center transition-all shadow-lg shadow-blue-900/20"
            >
              <PlusCircle size={18} className="mr-2" />
              Novo Agendamento
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
