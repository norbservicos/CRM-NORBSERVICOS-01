import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Client, ServiceType, Booking, Expense } from '../types';

const INITIAL_SERVICE_TYPES: ServiceType[] = [
  { id: '1', name: 'Limpeza de Sofá', description: 'Limpeza profunda e higienização de estofados.', defaultPrice: 250, estimatedTime: '02:00', active: true },
  { id: '2', name: 'Limpeza de Colchão', description: 'Remoção de ácaros e manchas de colchões.', defaultPrice: 180, estimatedTime: '01:30', active: true },
  { id: '3', name: 'Limpeza de Ar-condicionado', description: 'Limpeza completa de filtros e serpentina.', defaultPrice: 150, estimatedTime: '01:00', active: true },
  { id: '4', name: 'Montagem de Móveis', description: 'Montagem profissional de móveis diversos.', defaultPrice: 120, estimatedTime: '02:00', active: true },
];

export function useStore() {
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('norb_clients');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading clients from localStorage', e);
      return [];
    }
  });

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>(() => {
    try {
      const saved = localStorage.getItem('norb_service_types');
      return saved ? JSON.parse(saved) : INITIAL_SERVICE_TYPES;
    } catch (e) {
      console.error('Error loading service types from localStorage', e);
      return INITIAL_SERVICE_TYPES;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('norb_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading bookings from localStorage', e);
      return [];
    }
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try {
      const saved = localStorage.getItem('norb_expenses');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading expenses from localStorage', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('norb_clients', JSON.stringify(clients));
    } catch (e) {
      console.error('Error saving clients to localStorage', e);
    }
  }, [clients]);

  useEffect(() => {
    try {
      localStorage.setItem('norb_service_types', JSON.stringify(serviceTypes));
    } catch (e) {
      console.error('Error saving service types to localStorage', e);
    }
  }, [serviceTypes]);

  useEffect(() => {
    try {
      localStorage.setItem('norb_bookings', JSON.stringify(bookings));
    } catch (e) {
      console.error('Error saving bookings to localStorage', e);
    }
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem('norb_expenses', JSON.stringify(expenses));
    } catch (e) {
      console.error('Error saving expenses to localStorage', e);
    }
  }, [expenses]);

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient = { ...client, id: uuidv4(), createdAt: new Date().toISOString() };
    setClients(prev => [...prev, newClient]);
    return newClient;
  };

  const updateClient = (id: string, client: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...client } : c));
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const addServiceType = (service: Omit<ServiceType, 'id'>) => {
    setServiceTypes(prev => [...prev, { ...service, id: uuidv4() }]);
  };

  const updateServiceType = (id: string, service: Partial<ServiceType>) => {
    setServiceTypes(prev => prev.map(s => s.id === id ? { ...s, ...service } : s));
  };

  const deleteServiceType = (id: string) => {
    setServiceTypes(prev => prev.filter(s => s.id !== id));
  };

  const addBooking = (booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const newBooking = { ...booking, id: uuidv4(), createdAt: new Date().toISOString() };
    setBookings(prev => [...prev, newBooking]);
    return newBooking;
  };

  const updateBooking = (id: string, booking: Partial<Booking>) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, ...booking } : b));
  };

  const deleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense = { ...expense, id: uuidv4(), createdAt: new Date().toISOString() };
    setExpenses(prev => [...prev, newExpense]);
    return newExpense;
  };

  const updateExpense = (id: string, expense: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...expense } : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  return {
    clients,
    serviceTypes,
    bookings,
    expenses,
    addClient,
    updateClient,
    deleteClient,
    addServiceType,
    updateServiceType,
    deleteServiceType,
    addBooking,
    updateBooking,
    deleteBooking,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
