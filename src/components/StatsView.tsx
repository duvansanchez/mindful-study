import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Calendar, TrendingUp, Clock, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { DatabaseGroup } from '@/types';
import { useGroups, useGroupStats } from '@/hooks/useGroups';
import { useNotionDatabases } from '@/hooks/useNotion';
import { useMultiPeriodStats, useLastStudyDate } from '@/hooks/useStudyTracking';
import { useFlashcardReviewCount } from '@/hooks/useStudyTracking';
import { StateBadge } from './StateBadge';
import { useQuery } from '@tanstack/react-query';

interface StatsViewProps {
  onBack: () => void;
}

interface StudyStats {
  today: number;
  thisWeek: number;
  thisMonth: number;
  isLoading: boolean;
  error: Error | null;
  refetch?: () => Promise<void>;
}

export const StatsView: React.FC<StatsViewProps> = ({ onBack }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { data: groups = [], isLoading: groupsLoading } = useGroups();
  const { data: databases = [], isLoading: databasesLoading } = useNotionDatabases(true);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Hace menos de 1 hora';
    if (diffHours < 24) return `Hace ${diffHours} horas`;
    if (diffHours < 48) return 'Ayer';
    return date.toLocaleDateString();
  };

  const getPeriodLabel = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta semana';
      case 'month': return 'Este mes';
    }
  };

  const getStudiedCount = (stats: StudyStats, period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return stats.today;
      case 'week': return stats.thisWeek;
      case 'month': return stats.thisMonth;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </button>
        
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Estadísticas Centralizadas</h1>
        </div>
      </div>

      {/* Selector de período */}
      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        {(['day', 'week', 'month'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              selectedPeriod === period
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {getPeriodLabel(period)}
          </button>
        ))}
      </div>

      {/* Estadísticas por agrupación */}
      <div className="space-y-4">
        {groupsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-2 text-muted-foreground">Cargando estadísticas...</span>
          </div>
        ) : groups.length > 0 ? (
          groups.map((group) => {
            return (
              <GroupStatsCard
                key={group.id}
                group={group}
                period={selectedPeriod}
                databases={databases}
              />
            );
          })
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No hay agrupaciones</h3>
            <p>Crea agrupaciones para ver estadísticas detalladas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface GroupStatsCardProps {
  group: DatabaseGroup;
  period: 'day' | 'week' | 'month';
  databases: Array<{ id: string; name: string }>;
}

// Hook para obtener flashcards de una base de datos
const useDatabaseFlashcards = (databaseId: string) => {
  return useQuery({
    queryKey: ['database-flashcards', databaseId],
    queryFn: async () => {
      const response = await fetch(`/api/databases/${databaseId}/flashcards`);
      if (!response.ok) {
        throw new Error('Error fetching flashcards');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

const GroupStatsCard: React.FC<GroupStatsCardProps> = ({ 
  group, 
  period,
  databases 
}) => {
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const { data: groupStats, isLoading: isLoadingStats, refetch: refetchStats } = useGroupStats(group.id);
  const studyStats = useMultiPeriodStats(group.id);
  const { data: lastStudied, refetch: refetchLastStudied } = useLastStudyDate(group.id);
  
  const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));
  
  // Función para refrescar todas las estadísticas
  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStats(),
      refetchLastStudied(),
      // También invalidar las estadísticas de estudio
      studyStats.refetch?.()
    ]);
  };
  
  const toggleDatabase = (databaseId: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(databaseId)) {
      newExpanded.delete(databaseId);
    } else {
      newExpanded.add(databaseId);
    }
    setExpandedDatabases(newExpanded);
  };
  
  const getPeriodIcon = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return <Calendar className="w-4 h-4" />;
      case 'week': return <TrendingUp className="w-4 h-4" />;
      case 'month': return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getStudiedCount = (stats: StudyStats, period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return stats.today;
      case 'week': return stats.thisWeek;
      case 'month': return stats.thisMonth;
    }
  };

  const studiedCount = getStudiedCount(studyStats, period);

  return (
    <div className="p-6 bg-card border border-border rounded-lg space-y-4">
      {/* Header del grupo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <div 
              className="w-4 h-4 rounded"
              style={{ backgroundColor: group.color }}
            />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{group.name}</h3>
            <p className="text-sm text-muted-foreground">
              {groupDatabases.length} bases de datos
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              {formatDate(lastStudied)}
            </div>
          </div>
          <button
            onClick={handleRefreshAll}
            className="px-3 py-1 text-xs bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
            disabled={isLoadingStats || studyStats.isLoading}
          >
            {(isLoadingStats || studyStats.isLoading) ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        </div>
      </div>

      {/* Estadísticas de estudio */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            {getPeriodIcon(period)}
            <span className="text-sm font-medium">Estudiadas {period === 'day' ? 'hoy' : period === 'week' ? 'esta semana' : 'este mes'}</span>
          </div>
          <p className="text-2xl font-bold text-primary">{studiedCount}</p>
        </div>
        
        <div className="p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Total tarjetas</span>
          </div>
          <p className="text-2xl font-bold">{(groupStats as { total?: number })?.total || 0}</p>
        </div>
      </div>

      {/* Estadísticas de dominio */}
      {isLoadingStats ? (
        <div className="flex items-center justify-center py-4">
          <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
        </div>
      ) : groupStats ? (
        <div>
          <h4 className="text-sm font-medium mb-3">Distribución por dominio</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <StateBadge state="tocado" size="sm" />
              <p className="text-lg font-semibold mt-1">{(groupStats as { tocado?: number })?.tocado || 0}</p>
            </div>
            <div className="text-center">
              <StateBadge state="verde" size="sm" />
              <p className="text-lg font-semibold mt-1">{(groupStats as { verde?: number })?.verde || 0}</p>
            </div>
            <div className="text-center">
              <StateBadge state="solido" size="sm" />
              <p className="text-lg font-semibold mt-1">{(groupStats as { solido?: number })?.solido || 0}</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Lista de bases de datos */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Bases de datos</h4>
        {groupDatabases.map((database) => (
          <DatabaseStatsCard
            key={database.id}
            database={database}
            isExpanded={expandedDatabases.has(database.id)}
            onToggle={() => toggleDatabase(database.id)}
          />
        ))}
      </div>
    </div>
  );
};

const formatDate = (date: Date | null) => {
  if (!date) return 'Nunca';
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Hace menos de 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffHours < 48) return 'Ayer';
  return date.toLocaleDateString();
};

// Componente para mostrar estadísticas de una base de datos individual
interface DatabaseStatsCardProps {
  database: { id: string; name: string };
  isExpanded: boolean;
  onToggle: () => void;
}

const DatabaseStatsCard: React.FC<DatabaseStatsCardProps> = ({
  database,
  isExpanded,
  onToggle
}) => {
  const { data: flashcards = [], isLoading } = useDatabaseFlashcards(database.id);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header de la base de datos */}
      <button
        onClick={onToggle}
        className="w-full p-3 bg-secondary/30 hover:bg-secondary/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">{database.name}</span>
          <span className="text-sm text-muted-foreground">
            ({flashcards.length} flashcards)
          </span>
        </div>
      </button>

      {/* Lista de flashcards expandida */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-muted-foreground">Cargando flashcards...</span>
            </div>
          ) : flashcards.length > 0 ? (
            flashcards.map((flashcard: { id: string; title: string; state: 'tocado' | 'verde' | 'solido' }) => (
              <FlashcardStatsRow key={flashcard.id} flashcard={flashcard} />
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No hay flashcards en esta base de datos</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Componente para mostrar una fila de flashcard con sus estadísticas
interface FlashcardStatsRowProps {
  flashcard: {
    id: string;
    title: string;
    state: 'tocado' | 'verde' | 'solido';
  };
}

const FlashcardStatsRow: React.FC<FlashcardStatsRowProps> = ({ flashcard }) => {
  const { data: reviewCount = 0, isLoading } = useFlashcardReviewCount(flashcard.id);

  return (
    <div className="flex items-center justify-between p-2 bg-background rounded border border-border/50 hover:border-border transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <StateBadge state={flashcard.state} size="xs" />
        <span className="text-sm text-foreground truncate" title={flashcard.title}>
          {flashcard.title}
        </span>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RotateCcw className="w-3 h-3" />
          {isLoading ? (
            <div className="w-4 h-4 border border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="font-medium">{reviewCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};