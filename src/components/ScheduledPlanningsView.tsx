import React, { useState, useMemo } from 'react';
import { ArrowLeft, Calendar, Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlanningSessionsNextDays } from '@/hooks/usePlanning';
import { PlanningSession } from '@/types';

interface ScheduledPlanningsViewProps {
  onBack: () => void;
}

// Extender PlanningSession para incluir groupName que viene del backend
interface PlanningSessionWithGroup extends PlanningSession {
  groupName?: string;
}

type TimeOfDay = 'morning' | 'afternoon' | 'night';

interface CategorizedPlannings {
  morning: PlanningSessionWithGroup[];
  afternoon: PlanningSessionWithGroup[];
  night: PlanningSessionWithGroup[];
}

// Helper para convertir Date a string YYYY-MM-DD (formato local, no UTC)
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTimeOfDay = (date: Date): TimeOfDay => {
  const hours = date.getHours();
  if (hours >= 6 && hours < 12) return 'morning';
  if (hours >= 12 && hours < 18) return 'afternoon';
  return 'night';
};

const categorizeByTimeOfDay = (sessions: PlanningSessionWithGroup[]): CategorizedPlannings => {
  const categorized: CategorizedPlannings = {
    morning: [],
    afternoon: [],
    night: [],
  };

  sessions.forEach(session => {
    const reviewDate = session.reviewDate ? new Date(session.reviewDate) : new Date();
    const timeOfDay = getTimeOfDay(reviewDate);
    categorized[timeOfDay].push(session);
  });

  // Sort each category by time
  Object.keys(categorized).forEach(key => {
    categorized[key as TimeOfDay].sort((a, b) => {
      const dateA = a.reviewDate ? new Date(a.reviewDate) : new Date();
      const dateB = b.reviewDate ? new Date(b.reviewDate) : new Date();
      const hourA = dateA.getHours();
      const hourB = dateB.getHours();
      return hourA - hourB;
    });
  });

  return categorized;
};

const DayCell = ({ 
  date, 
  sessions, 
  isCurrentMonth, 
  onClick 
}: { 
  date: Date; 
  sessions: PlanningSessionWithGroup[]; 
  isCurrentMonth: boolean;
  onClick: () => void;
}) => {
  const dayNum = date.getDate();
  const hasNoSessions = sessions.length === 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full min-h-24 p-2 border rounded-lg transition-colors ${
        isCurrentMonth ? 'bg-card' : 'bg-secondary/20'
      } ${
        !isCurrentMonth ? 'opacity-50' : 'hover:bg-secondary/50 cursor-pointer'
      }`}
    >
      <div className="text-sm font-semibold mb-2">{dayNum}</div>
      {!hasNoSessions && (
        <div className="space-y-0.5">
          <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded truncate">
            {sessions.length} sesión{sessions.length !== 1 ? 'es' : ''}
          </div>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {sessions.slice(0, 2).map((s, idx) => {
              const time = s.reviewDate ? new Date(s.reviewDate).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              }) : '--:--';
              return (
                <div key={idx} className="truncate">
                  {time}
                </div>
              );
            })}
            {sessions.length > 2 && <div className="text-xs">+{sessions.length - 2} más</div>}
          </div>
        </div>
      )}
    </button>
  );
};

const TimeOfDaySection = ({ 
  title, 
  icon: Icon, 
  sessions, 
  color 
}: { 
  title: string; 
  icon: React.ReactNode; 
  sessions: PlanningSessionWithGroup[]; 
  color: string;
}) => {
  if (sessions.length === 0) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className={`flex items-center gap-2 px-4 py-3 ${color} text-white`}>
        {Icon}
        <h3 className="font-semibold text-sm">{title}</h3>
        <span className="ml-auto text-xs font-bold">{sessions.length}</span>
      </div>
      <div className="divide-y divide-border">
        {sessions.map(session => {
          const time = session.reviewDate ? new Date(session.reviewDate).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }) : '--:--';
          return (
            <div key={session.id} className="px-4 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors">
              <Clock className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{session.sessionName}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <span>{time}</span>
                </div>
                {session.groupName && (
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {session.groupName}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ScheduledPlanningsView: React.FC<ScheduledPlanningsViewProps> = ({ onBack }) => {
  const { data: plannings = [], isLoading } = usePlanningSessionsNextDays();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Debug: log plannings data
  console.log('📅 [ScheduledPlanningsView] Total plannings:', plannings.length);
  if (plannings.length > 0) {
    console.log('📅 First planning:', plannings[0]);
    plannings.forEach(p => {
      console.log(`📅 Planning: ${p.sessionName}, ReviewDate: ${p.reviewDate}, Key: ${formatDateKey(new Date(p.reviewDate || ''))}`);
    });
  }

  // Get the first and last day of the current month
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Get the first day of the calendar grid (may start from previous month)
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay());

  // Generate calendar days
  const calendarDays: Date[] = [];
  const dateIter = new Date(startDate);
  while (dateIter <= lastDay || calendarDays.length % 7 !== 0) {
    calendarDays.push(new Date(dateIter));
    dateIter.setDate(dateIter.getDate() + 1);
  }

  // Group plannings by date
  const planningsByDate = useMemo(() => {
    const map = new Map<string, PlanningSessionWithGroup[]>();
    const planningsWithGroup = (plannings as PlanningSessionWithGroup[]) || [];
    
    planningsWithGroup.forEach(planning => {
      if (planning.reviewDate) {
        const dateKey = formatDateKey(new Date(planning.reviewDate));
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(planning);
      }
    });
    return map;
  }, [plannings]);

  // Get selected date plannings
  const selectedPlannings = selectedDate
    ? planningsByDate.get(formatDateKey(selectedDate)) || []
    : [];

  const categorized = categorizeByTimeOfDay(selectedPlannings);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Cargando planificaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            Planificaciones programadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista de calendario de todas tus sesiones de estudio
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Calendar */}
        <div className="space-y-4">
          <div className="border border-border rounded-lg p-4">
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-lg capitalize">{monthName}</h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, idx) => {
                const dateKey = formatDateKey(date);
                const dayPlannings = planningsByDate.get(dateKey) || [];
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(date)}
                    className={`${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <DayCell
                      date={date}
                      sessions={dayPlannings}
                      isCurrentMonth={isCurrentMonth}
                      onClick={() => {}}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total info */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de sesiones</p>
                <p className="text-2xl font-bold text-blue-500">{plannings.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Selected day details */}
        {selectedDate && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-semibold capitalize">
                {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </h3>
              <p className="text-2xl font-bold text-blue-500 mt-2">{selectedPlannings.length}</p>
              <p className="text-xs text-muted-foreground">sesión{selectedPlannings.length !== 1 ? 'es' : ''} programada{selectedPlannings.length !== 1 ? 's' : ''}</p>
            </div>

            <TimeOfDaySection
              title="Mañana"
              icon={<Calendar className="w-4 h-4" />}
              sessions={categorized.morning}
              color="bg-amber-500"
            />

            <TimeOfDaySection
              title="Tarde"
              icon={<Clock className="w-4 h-4" />}
              sessions={categorized.afternoon}
              color="bg-orange-500"
            />

            <TimeOfDaySection
              title="Noche"
              icon={<Calendar className="w-4 h-4" />}
              sessions={categorized.night}
              color="bg-indigo-500"
            />

            {selectedPlannings.length === 0 && (
              <div className="bg-secondary/30 border border-border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No hay planificaciones para este día
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
