export type ServiceStatus = 'agendado' | 'pendente' | 'concluído' | 'cancelado' | 'perdido';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartão';
export type Gender = 'masculino' | 'feminino';

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  gender: Gender;
  observations?: string;
  lastNotificationDismissedAt?: string;
  createdAt: string;
  uid: string;
}

export interface ServiceType {
  id: string;
  name: string;
  description: string;
  defaultPrice?: number;
  estimatedTime?: string;
  active: boolean;
  uid: string;
}

export interface Booking {
  id: string;
  clientId: string;
  serviceTypeId: string;
  date: string;
  time: string;
  originalPrice: number;
  discount: number;
  coupon?: string;
  finalPrice: number;
  status: ServiceStatus;
  paymentMethod?: PaymentMethod;
  lostReason?: string;
  observations?: string;
  createdAt: string;
  uid: string;
}

export type ExpenseCategory = 'investimento' | 'operacional' | 'manutenção' | 'outro';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  createdAt: string;
  uid: string;
}

export type LeadStatus = 'novo' | 'em_atendimento' | 'fechado' | 'perdido' | string;

export interface Lead {
  id: string;
  fullName: string;
  whatsappNumber: string;
  selectedCity: string;
  selectedFurniture: string;
  notes: string;
  status: LeadStatus;
  createdAt: string;
  source?: string;
  value?: number;
  gclid?: string;
  uid?: string;
}

export interface DashboardStats {
  totalMonth: number;
  scheduled: number;
  scheduledValue: number;
  completed: number;
  lost: number;
  totalRevenue: number;
  totalExpenses: number;
  profit: number;
}
