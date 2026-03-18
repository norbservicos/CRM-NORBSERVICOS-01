import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  User
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  isSameDay, 
  addWeeks, 
  subWeeks 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../hooks/useStore';
import { cn } from '../utils/utils';

export default function Agenda({ store }: { store: ReturnType<typeof useStore> }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = [...Array(7)].map((_, i) => addDays(startDate, i));

  const hours = [...Array(14)].map((_, i) => `${i + 8}:00`);

  const getBookingsForDayAndHour = (day: Date, hour: string) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const hourPrefix = hour.split(':')[0].padStart(2, '0');
    
    return store.bookings.filter(b => 
      b.date === dayStr && 
      b.time.startsWith(hourPrefix) &&
      b.status !== 'cancelado'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Agenda Visual</h2>
          <p className="text-slate-500">Visualize e organize seus horários da semana.</p>
        </div>
        <div className="flex items-center bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
          <button 
            onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 font-bold text-sm text-slate-700 min-w-[200px] text-center">
            <span>{format(weekDays[0], "dd 'de' MMM", { locale: ptBR })}</span> - <span>{format(weekDays[6], "dd 'de' MMM", { locale: ptBR })}</span>
          </div>
          <button 
            onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50/50">
              <div className="p-4 border-r border-slate-100"></div>
              {weekDays.map(day => (
                <div 
                  key={day.toString()} 
                  className={cn(
                    "p-4 text-center border-r border-slate-100 last:border-r-0",
                    isSameDay(day, new Date()) && "bg-blue-50"
                  )}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{format(day, 'EEE', { locale: ptBR })}</span>
                  </p>
                  <p className={cn(
                    "text-lg font-black",
                    isSameDay(day, new Date()) ? "text-blue-900" : "text-slate-900"
                  )}>
                    <span>{format(day, 'dd')}</span>
                  </p>
                </div>
              ))}
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {hours.map(hour => (
                <div key={hour} className="grid grid-cols-8 border-b border-slate-50 last:border-b-0 min-h-[80px]">
                  <div className="p-4 border-r border-slate-100 text-right">
                    <span className="text-xs font-bold text-slate-400"><span>{hour}</span></span>
                  </div>
                  {weekDays.map(day => {
                    const dayBookings = getBookingsForDayAndHour(day, hour);
                    return (
                      <div key={day.toString() + hour} className="p-1 border-r border-slate-100 last:border-r-0 relative group">
                        {dayBookings.map(booking => {
                          const client = store.clients.find(c => c.id === booking.clientId);
                          const service = store.serviceTypes.find(s => s.id === booking.serviceTypeId);
                          return (
                            <div 
                              key={booking.id}
                              className={cn(
                                "p-2 rounded-xl text-[10px] shadow-sm mb-1 border transition-all cursor-pointer hover:scale-[1.02]",
                                booking.status === 'concluído' 
                                  ? "bg-blue-50 border-blue-100 text-black" 
                                  : "bg-blue-50 border-blue-100 text-blue-700"
                              )}
                            >
                              <p className="font-bold truncate"><span>{client?.name}</span></p>
                              <p className="opacity-70 truncate"><span>{service?.name}</span></p>
                              <p className="mt-1 font-black"><span>{booking.time}</span></p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
