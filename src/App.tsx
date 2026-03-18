import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
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
  Search,
  LogIn,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from './firebase';
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
import { Booking } from './types';
import { useStore } from './hooks/useStore';

// Error Boundary Component
class ErrorBoundary extends (React.Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "");
        if (parsed.error && parsed.error.includes("insufficient permissions")) {
          errorMessage = "Você não tem permissão para realizar esta ação ou acessar estes dados.";
        }
      } catch {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Ops! Algo deu errado</h2>
            <p className="text-slate-600 mb-8">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-lg shadow-blue-900/20"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type Tab = 'dashboard' | 'clients' | 'catalog' | 'booking' | 'services' | 'agenda' | 'finance' | 'reports' | 'expenses';

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const store = useStore();

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Ignore cancellation errors as they are usually user-triggered or race conditions
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error('Login error:', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setActiveTab('booking');
  };

  const handleNewBooking = () => {
    setEditingBooking(null);
    setActiveTab('booking');
  };

  if (!store.isAuthReady) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Logo collapsed={false} />
          <div className="mt-8 w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!store.user) {
    return (
      <div className="min-h-screen bg-blue-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-[40px] p-12 max-w-md w-full shadow-2xl text-center space-y-8">
          <div className="flex justify-center">
            <Logo collapsed={false} variant="light" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2">Bem-vindo!</h2>
            <p className="text-slate-500">Faça login para gerenciar seus serviços e clientes com segurança.</p>
          </div>
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold bg-blue-900 text-white hover:bg-black transition-all shadow-xl shadow-blue-900/20 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
            )}
            {isLoggingIn ? 'Conectando...' : 'Entrar com Google'}
          </button>
          <p className="text-xs text-slate-400">Ao entrar, você concorda com nossos termos de uso.</p>
        </div>
      </div>
    );
  }

  if (store.loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium animate-pulse">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

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
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar Overlay for Mobile */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-slate-900 text-white transition-all duration-300 flex flex-col fixed h-full z-50 shadow-2xl",
          isSidebarOpen ? "w-64 translate-x-0" : isMobile ? "-translate-x-full" : "w-20 translate-x-0"
        )}
      >
        <div className={cn("p-6 flex items-center justify-between", !isSidebarOpen && !isMobile && "px-0 justify-center")}>
          <Logo collapsed={!isSidebarOpen && !isMobile} />
          {isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {!isSidebarOpen && !isMobile && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="mx-auto mb-6 p-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
        )}

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.onClick) item.onClick();
                else setActiveTab(item.id as Tab);
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={cn(
                "w-full flex items-center p-3 rounded-xl transition-all group",
                activeTab === item.id 
                  ? "bg-blue-900 text-white shadow-lg shadow-blue-900/20" 
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              <item.icon size={20} className={cn(activeTab === item.id ? "text-white" : "group-hover:text-white")} />
              {(isSidebarOpen || isMobile) && <span className="ml-3 font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className={cn("flex items-center justify-between", !isSidebarOpen && "flex-col space-y-4")}>
            <div className={cn("flex items-center", isSidebarOpen ? "space-x-3" : "justify-center")}>
              <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center font-bold text-xs overflow-hidden">
                {store.user.photoURL ? (
                  <img src={store.user.photoURL} alt="User" referrerPolicy="no-referrer" />
                ) : (
                  store.user.displayName?.charAt(0) || 'U'
                )}
              </div>
              {isSidebarOpen && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{store.user.displayName}</p>
                  <p className="text-xs text-slate-400 truncate">{store.user.email}</p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        isSidebarOpen && !isMobile ? "ml-64" : !isMobile ? "ml-20" : "ml-0"
      )}>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-40">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <Menu size={24} />
              </button>
            )}
            {!isSidebarOpen && !isMobile && <Logo collapsed className="scale-75 origin-left" />}
            <div className={cn("hidden md:flex items-center bg-slate-100 rounded-xl px-3 py-2 w-64 lg:w-96")}>
              <Search size={18} className="text-slate-400" />
              <input 
                type="text" 
                placeholder="Busca global..." 
                className="bg-transparent border-none focus:ring-0 ml-2 w-full text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Hoje</p>
              <p className="text-base font-bold text-slate-900">
                {store.bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length}
              </p>
            </div>
            <button 
              onClick={handleNewBooking}
              className="bg-blue-900 hover:bg-black text-white px-3 sm:px-4 py-2 rounded-xl font-medium flex items-center transition-all shadow-lg shadow-blue-900/20 text-sm sm:text-base"
            >
              <PlusCircle size={18} className="sm:mr-2" />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
