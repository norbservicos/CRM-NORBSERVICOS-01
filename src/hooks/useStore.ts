import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import type { Client, ServiceType, Booking, Expense } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const INITIAL_SERVICE_TYPES: Omit<ServiceType, 'uid'>[] = [
  { id: '1', name: 'Limpeza de Sofá', description: 'Limpeza profunda e higienização de estofados.', defaultPrice: 250, estimatedTime: '02:00', active: true },
  { id: '2', name: 'Limpeza de Colchão', description: 'Remoção de ácaros e manchas de colchões.', defaultPrice: 180, estimatedTime: '01:30', active: true },
  { id: '3', name: 'Limpeza de Ar-condicionado', description: 'Limpeza completa de filtros e serpentina.', defaultPrice: 150, estimatedTime: '01:00', active: true },
  { id: '4', name: 'Montagem de Móveis', description: 'Montagem profissional de móveis diversos.', defaultPrice: 120, estimatedTime: '02:00', active: true },
];

export function useStore() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email !== 'guilhermed952@gmail.com') {
        signOut(auth);
        setUser(null);
        setIsUnauthorized(true);
        setIsAuthReady(true);
        return;
      }
      
      setUser(user);
      setIsUnauthorized(false);
      setIsAuthReady(true);
      if (!user) {
        setClients([]);
        setServiceTypes([]);
        setBookings([]);
        setExpenses([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    setLoading(true);

    const qClients = query(collection(db, 'clients'), where('uid', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => doc.data() as Client));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'clients'));

    const qServiceTypes = query(collection(db, 'serviceTypes'), where('uid', '==', user.uid));
    const unsubServiceTypes = onSnapshot(qServiceTypes, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial service types if none exist for this user
        for (const st of INITIAL_SERVICE_TYPES) {
          const id = crypto.randomUUID();
          await setDoc(doc(db, 'serviceTypes', id), { ...st, id, uid: user.uid });
        }
      } else {
        setServiceTypes(snapshot.docs.map(doc => doc.data() as ServiceType));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'serviceTypes'));

    const qBookings = query(collection(db, 'bookings'), where('uid', '==', user.uid));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      setBookings(snapshot.docs.map(doc => doc.data() as Booking));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'bookings'));

    const qExpenses = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data() as Expense));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'expenses'));

    // Fallback loading state if snapshots are slow but empty
    const timeout = setTimeout(() => setLoading(false), 3000);

    return () => {
      unsubClients();
      unsubServiceTypes();
      unsubBookings();
      unsubExpenses();
      clearTimeout(timeout);
    };
  }, [isAuthReady, user]);

  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'uid'>) => {
    if (!user) return;

    // Check for duplicate phone number
    const existingClient = clients.find(c => c.phone.replace(/\D/g, '') === client.phone.replace(/\D/g, ''));
    if (existingClient) {
      return existingClient;
    }

    const id = crypto.randomUUID();
    const newClient = { 
      ...client, 
      id, 
      uid: user.uid,
      createdAt: new Date().toISOString() 
    };
    try {
      await setDoc(doc(db, 'clients', id), newClient);
      return newClient;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `clients/${id}`);
    }
  };

  const updateClient = async (id: string, client: Partial<Client>) => {
    try {
      await updateDoc(doc(db, 'clients', id), client);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `clients/${id}`);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'clients', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `clients/${id}`);
    }
  };

  const addServiceType = async (service: Omit<ServiceType, 'id' | 'uid'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    try {
      await setDoc(doc(db, 'serviceTypes', id), { ...service, id, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `serviceTypes/${id}`);
    }
  };

  const updateServiceType = async (id: string, service: Partial<ServiceType>) => {
    try {
      await updateDoc(doc(db, 'serviceTypes', id), service);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `serviceTypes/${id}`);
    }
  };

  const deleteServiceType = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'serviceTypes', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `serviceTypes/${id}`);
    }
  };

  const addBooking = async (booking: Omit<Booking, 'id' | 'createdAt' | 'uid'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const newBooking = { 
      ...booking, 
      id, 
      uid: user.uid,
      createdAt: new Date().toISOString() 
    };
    try {
      await setDoc(doc(db, 'bookings', id), newBooking);
      return newBooking;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `bookings/${id}`);
    }
  };

  const updateBooking = async (id: string, booking: Partial<Booking>) => {
    try {
      await updateDoc(doc(db, 'bookings', id), booking);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `bookings/${id}`);
    }
  };

  const deleteBooking = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'bookings', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `bookings/${id}`);
    }
  };

  const addExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'uid'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const newExpense = { 
      ...expense, 
      id, 
      uid: user.uid,
      createdAt: new Date().toISOString() 
    };
    try {
      await setDoc(doc(db, 'expenses', id), newExpense);
      return newExpense;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `expenses/${id}`);
    }
  };

  const updateExpense = async (id: string, expense: Partial<Expense>) => {
    try {
      await updateDoc(doc(db, 'expenses', id), expense);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `expenses/${id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `expenses/${id}`);
    }
  };

  return {
    user,
    isAuthReady,
    isUnauthorized,
    loading,
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
