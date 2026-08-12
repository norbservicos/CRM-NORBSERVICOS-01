import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import { db, auth, allDatabases } from '../firebase';
import type { Client, ServiceType, Booking, Expense, Lead } from '../types';

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
  const currentUser = auth.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
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
  { id: '1', name: 'Limpeza de ar condicionado', description: 'Limpeza completa de filtros e serpentina.', defaultPrice: 0, estimatedTime: '01:00', active: true },
  { id: '2', name: 'Limpeza de estofado', description: 'Limpeza profunda e higienização de estofados.', defaultPrice: 0, estimatedTime: '02:00', active: true },
  { id: '3', name: 'Desmontagem e montagem de moveis', description: 'Serviço profissional de desmontagem e montagem.', defaultPrice: 0, estimatedTime: '02:00', active: true },
];

function parseLeadDoc(docSnap: any): Lead {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id;

  // Raw date resolution (string, Timestamp or seconds)
  const rawDate = data.createdAt || data.CreatdAt || data.CreatedAt || data.created_at || data.date || data.data;
  let createdAt = new Date().toISOString();
  if (rawDate) {
    if (typeof rawDate === 'string') {
      createdAt = rawDate;
    } else if (rawDate?.toDate && typeof rawDate.toDate === 'function') {
      createdAt = rawDate.toDate().toISOString();
    } else if (rawDate?.seconds) {
      createdAt = new Date(rawDate.seconds * 1000).toISOString();
    }
  }

  const fullName = data.fullName || data.Fullname || data.FullName || data.name || data.Name || data.Nome || data.nome || 'Sem nome';
  const whatsappNumber = data.whatsappNumber || data['Whatsapp mulher'] || data['whatsapp mulher'] || data.whatsappMulher || data.whatsapp || data.Whatsapp || data.phone || data.Phone || data.telefone || '';
  const selectedCity = data.selectedCity || data.SelectedCity || data.city || data.City || data.cidade || '';
  const selectedFurniture = data.selectedFurniture || data.SelectedFurniture || data.furniture || data.Furniture || data.serviceInterest || data.servico || '';
  const notes = data.notes || data.Notes || data.message || data.observations || data.observacao || '';
  const gclid = data.gclid || data.Gclid || data.gClickId || data.g_click_id || data.GCLID || '';
  const rawStatus = data.status || data.Status;
  const status = (rawStatus ? rawStatus.toString().trim().toLowerCase() : 'novo') as Lead['status'];

  return {
    ...data,
    id,
    fullName,
    whatsappNumber,
    selectedCity,
    selectedFurniture,
    notes,
    gclid,
    status: status || 'novo',
    createdAt,
    source: data.source || 'Formulário',
    value: data.value ? Number(data.value) : (data.Value ? Number(data.Value) : (data.valor ? Number(data.valor) : 0)),
    uid: data.uid || ''
  };
}

export function useStore() {
  const canonicalMapRef = useRef<Record<string, string>>({});
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Separate, immediate listener for Leads collection across all database instances
  useEffect(() => {
    const leadsMapByDb: Record<number, Map<string, Lead>> = {};
    allDatabases.forEach((_, idx) => {
      leadsMapByDb[idx] = new Map();
    });

    const updateCombinedLeads = () => {
      const mergedMap = new Map<string, Lead>();
      allDatabases.forEach((_, idx) => {
        leadsMapByDb[idx]?.forEach((lead, id) => {
          mergedMap.set(id, lead);
        });
      });
      const items = Array.from(mergedMap.values());
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeads(items);
    };

    const unsubs = allDatabases.map((targetDb, dbIdx) => {
      const qLeads = collection(targetDb, 'leads');

      getDocs(qLeads).then((snapshot) => {
        snapshot.docs.forEach((docSnap) => {
          const lead = parseLeadDoc(docSnap);
          (lead as any)._dbIndex = dbIdx;
          leadsMapByDb[dbIdx].set(lead.id, lead);
        });
        updateCombinedLeads();
      }).catch((err) => {
        console.warn(`Erro na busca inicial do banco ${dbIdx}:`, err);
      });

      return onSnapshot(qLeads, (snapshot) => {
        leadsMapByDb[dbIdx].clear();
        snapshot.docs.forEach((docSnap) => {
          const lead = parseLeadDoc(docSnap);
          (lead as any)._dbIndex = dbIdx;
          leadsMapByDb[dbIdx].set(lead.id, lead);
        });
        updateCombinedLeads();
      }, (err) => {
        console.warn(`Erro na escuta em tempo real do banco ${dbIdx}:`, err);
      });
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('User detected:', user.email);
        if (user.email?.toLowerCase() !== 'guilhermed952@gmail.com') {
          console.warn('Unauthorized user blocked:', user.email);
          // Wrong user!
          signOut(auth);
          setUser(null);
          setIsUnauthorized(true);
          setIsAuthReady(true);
          setLoading(false);
          return;
        }
        // Authorized user
        setUser(user);
        setIsUnauthorized(false);
        setIsAuthReady(true);
      } else {
        // No user
        setUser(null);
        // We don't reset isUnauthorized here to keep the error message visible if they just failed
        setIsAuthReady(true);
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
    if (!isAuthReady || !user || isUnauthorized) return;

    setLoading(true);
    setError(null);

    const handleError = (err: any, type: OperationType, path: string) => {
      console.error(`Store error (${type}) on ${path}:`, err);
      setError(`Erro ao carregar dados (${path}). Verifique sua conexão.`);
      setLoading(false);
      handleFirestoreError(err, type, path);
    };

    const qClients = query(collection(db, 'clients'), where('uid', '==', user.uid));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => doc.data() as Client));
    }, (error) => handleError(error, OperationType.LIST, 'clients'));

    const qServiceTypes = query(collection(db, 'serviceTypes'), where('uid', '==', user.uid));
    const unsubServiceTypes = onSnapshot(qServiceTypes, async (snapshot) => {
      try {
        const services = snapshot.docs.map(doc => doc.data() as ServiceType);
        
        if (snapshot.empty) {
          console.log('Seeding initial service types...');
          // Seed initial service types if none exist for this user
          for (const st of INITIAL_SERVICE_TYPES) {
            const id = uuidv4();
            await setDoc(doc(db, 'serviceTypes', id), { ...st, id, uid: user.uid });
          }
        } else {
          // Group services by trimmed lowercase name to identify and eliminate duplicates
          const groups: Record<string, ServiceType[]> = {};
          for (const s of services) {
            const key = s.name.trim().toLowerCase();
            if (!groups[key]) {
              groups[key] = [];
            }
            groups[key].push(s);
          }

          const uniqueServices: ServiceType[] = [];
          const duplicatesToDelete: ServiceType[] = [];
          const canonicalMap: Record<string, ServiceType> = {};
          const alternateToCanonicalIdMap: Record<string, string> = {};

          for (const key of Object.keys(groups)) {
            const list = groups[key];
            const canonical = list[0];
            uniqueServices.push(canonical);
            for (let i = 1; i < list.length; i++) {
              duplicatesToDelete.push(list[i]);
              canonicalMap[list[i].id] = canonical;
              alternateToCanonicalIdMap[list[i].id] = canonical.id;
            }
          }

          canonicalMapRef.current = alternateToCanonicalIdMap;
          setServiceTypes(uniqueServices);

          // Perform cleanup of duplicate service types and migrate any related bookings
          if (duplicatesToDelete.length > 0) {
            console.log(`Found ${duplicatesToDelete.length} duplicate service types. Executing migration...`);
            (async () => {
              try {
                // Get current bookings to check for any references to duplicate IDs
                const qBookings = query(collection(db, 'bookings'), where('uid', '==', user.uid));
                const bookingsSnap = await getDocs(qBookings);
                const allBookings = bookingsSnap.docs.map(doc => doc.data() as Booking);

                for (const duplicate of duplicatesToDelete) {
                  const canonical = canonicalMap[duplicate.id];
                  const affectedBookings = allBookings.filter(b => b.serviceTypeId === duplicate.id);

                  if (affectedBookings.length > 0) {
                    console.log(`Migrating ${affectedBookings.length} bookings from duplicate service ${duplicate.id} (${duplicate.name}) to canonical ID ${canonical.id}`);
                    for (const booking of affectedBookings) {
                      await updateDoc(doc(db, 'bookings', booking.id), { serviceTypeId: canonical.id });
                    }
                  }

                  console.log(`Deleting duplicate service type from Firestore: ${duplicate.id} (${duplicate.name})`);
                  await deleteDoc(doc(db, 'serviceTypes', duplicate.id));
                }
                console.log('Service types migration successfully completed.');
              } catch (err) {
                console.error('Error during service types migration:', err);
              }
            })();
          }
        }
      } catch (err) {
        handleError(err, OperationType.LIST, 'serviceTypes');
      }
    }, (error) => handleError(error, OperationType.LIST, 'serviceTypes'));

    const qBookings = query(collection(db, 'bookings'), where('uid', '==', user.uid));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bookingsRaw = snapshot.docs.map(doc => doc.data() as Booking);
      const mappedBookings = bookingsRaw.map(b => {
        const canonicalId = canonicalMapRef.current[b.serviceTypeId];
        if (canonicalId) {
          return { ...b, serviceTypeId: canonicalId };
        }
        return b;
      });
      setBookings(mappedBookings);
    }, (error) => handleError(error, OperationType.LIST, 'bookings'));

    const qExpenses = query(collection(db, 'expenses'), where('uid', '==', user.uid));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => doc.data() as Expense));
      setLoading(false);
    }, (error) => handleError(error, OperationType.LIST, 'expenses'));

    // Fallback loading state if snapshots are slow but empty
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubClients();
      unsubServiceTypes();
      unsubBookings();
      unsubExpenses();
      clearTimeout(timeout);
    };
  }, [isAuthReady, user, isUnauthorized]);

  const addClient = async (client: Omit<Client, 'id' | 'createdAt' | 'uid'>) => {
    if (!user) return;

    // Check for duplicate name and phone number
    const existingClient = clients.find(c => 
      c.name.toLowerCase() === client.name.toLowerCase() && 
      c.phone.replace(/\D/g, '') === client.phone.replace(/\D/g, '')
    );
    
    if (existingClient) {
      throw new Error('CLIENT_EXISTS');
    }

    const id = uuidv4();
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

    // Check for duplicate service name
    const existingService = serviceTypes.find(s => 
      s.name.toLowerCase() === service.name.toLowerCase()
    );

    if (existingService) {
      throw new Error('SERVICE_EXISTS');
    }

    const id = uuidv4();
    try {
      await setDoc(doc(db, 'serviceTypes', id), { ...service, id, uid: user.uid });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `serviceTypes/${id}`);
    }
  };

  const updateServiceType = async (id: string, service: Partial<ServiceType>) => {
    if (service.name) {
      const existingService = serviceTypes.find(s => 
        s.id !== id && s.name.toLowerCase().trim() === service.name!.toLowerCase().trim()
      );
      if (existingService) {
        throw new Error('SERVICE_EXISTS');
      }
    }
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
    const id = uuidv4();
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
    const id = uuidv4();
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

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt'>) => {
    const id = uuidv4();
    const nowIso = new Date().toISOString();
    const newLead = {
      ...lead,
      id,
      createdAt: nowIso,
      CreatdAt: nowIso,
      Fullname: lead.fullName,
      Notes: lead.notes,
      SelectedCity: lead.selectedCity,
      selectedFurniture: lead.selectedFurniture,
      Status: lead.status,
      'Whatsapp mulher': lead.whatsappNumber,
      uid: user?.uid || ''
    };
    for (const targetDb of allDatabases) {
      try {
        await setDoc(doc(targetDb, 'leads', id), newLead);
      } catch (error) {
        console.warn('Erro ao salvar lead no banco:', error);
      }
    }
    return newLead;
  };

  const updateLead = async (id: string, lead: Partial<Lead>) => {
    const targetLead = leads.find(l => l.id === id);
    const dbIndex = (targetLead as any)?._dbIndex;
    const targetDbs = dbIndex !== undefined && allDatabases[dbIndex]
      ? [allDatabases[dbIndex]]
      : allDatabases;

    const updates: any = { ...lead };
    if (lead.fullName !== undefined) {
      updates.Fullname = lead.fullName;
      updates.fullName = lead.fullName;
    }
    if (lead.notes !== undefined) {
      updates.Notes = lead.notes;
      updates.notes = lead.notes;
    }
    if (lead.gclid !== undefined) {
      updates.gclid = lead.gclid;
    }
    if (lead.selectedCity !== undefined) {
      updates.SelectedCity = lead.selectedCity;
      updates.selectedCity = lead.selectedCity;
    }
    if (lead.selectedFurniture !== undefined) {
      updates.selectedFurniture = lead.selectedFurniture;
      updates.SelectedFurniture = lead.selectedFurniture;
    }
    if (lead.status !== undefined) {
      updates.Status = lead.status;
      updates.status = lead.status;
    }
    if (lead.whatsappNumber !== undefined) {
      updates['Whatsapp mulher'] = lead.whatsappNumber;
      updates.whatsappNumber = lead.whatsappNumber;
    }
    if (lead.value !== undefined) {
      updates.value = Number(lead.value) || 0;
    }

    for (const targetDb of targetDbs) {
      try {
        await updateDoc(doc(targetDb, 'leads', id), updates);
      } catch (error) {
        console.warn(`Erro ao atualizar lead ${id} no banco:`, error);
      }
    }
  };

  const deleteLead = async (id: string) => {
    const targetLead = leads.find(l => l.id === id);
    const dbIndex = (targetLead as any)?._dbIndex;
    const targetDbs = dbIndex !== undefined && allDatabases[dbIndex]
      ? [allDatabases[dbIndex]]
      : allDatabases;

    for (const targetDb of targetDbs) {
      try {
        await deleteDoc(doc(targetDb, 'leads', id));
      } catch (error) {
        console.warn(`Erro ao remover lead ${id} do banco:`, error);
      }
    }
  };

  const convertLeadToClient = async (lead: Lead) => {
    if (!user) return;
    
    let existing = clients.find(c => 
      c.name.toLowerCase().trim() === lead.fullName.toLowerCase().trim() ||
      (lead.whatsappNumber && c.phone.replace(/\D/g, '') === lead.whatsappNumber.replace(/\D/g, ''))
    );

    let clientToReturn = existing;

    if (!existing) {
      clientToReturn = await addClient({
        name: lead.fullName,
        phone: lead.whatsappNumber || '',
        address: '',
        city: lead.selectedCity || 'Indefinido',
        gender: 'masculino',
        observations: `Lead vindo de: ${lead.source || 'Formulário'}.${lead.notes ? ` Notas: ${lead.notes}` : ''}`
      });
    }

    await updateLead(lead.id, { status: 'fechado' });
    return clientToReturn;
  };

  const resetUnauthorized = () => setIsUnauthorized(false);

  return {
    user,
    isAuthReady,
    isUnauthorized,
    resetUnauthorized,
    loading,
    error,
    clients,
    serviceTypes,
    bookings,
    expenses,
    leads,
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
    addLead,
    updateLead,
    deleteLead,
    convertLeadToClient
  };
}
