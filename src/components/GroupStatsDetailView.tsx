import React, { useState } from 'react';
import { ArrowLeft, BarChart3, ChevronDown, ChevronRight, RotateCcw, Clock, TrendingUp, Calendar } from 'lucide-react';
import { DatabaseGroup } from '@/types';
import { useGroupStats } from '@/hooks/useGroups';
import { useMultiPeriodStats, useLastStudyDate, useFlashcardReviewCount } from '@/hooks/useStudyTracking';
import { StateBadge } from './StateBadge';
import { useQuery } from '@tanstack/react-query';

interface GroupStatsDetailViewProps {
  group: DatabaseGroup;
  databases: Array<{ id: string; name: string }>;
  onBack: () => void;
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

export const GroupStatsDetailView: React.FC<GroupStatsDetailViewProps> = ({
  group,
  databases,
  onBack
}) => {
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  const { data: groupStats, isLoading: isLoadingStats, refetch: refetchStats } = useGroupStats(group.id);
  const studyStats = useMultiPeriodStats(group.id);
  const { data: lastStudied, refetch: refetchLastStudied } = useLastStudyDate(group.id);
  
  const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));
  
  const toggleDatabase = (databaseId: string) => {
    const newExpanded = new Set(expandedDatabases);
    if (newExpanded.has(databaseId)) {
      newExpanded.delete(databaseId);
    } else {
      newExpanded.add(databaseId);
    }
    setExpandedDatabases(newExpanded);
  };

  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStats(),
      refetchLastStudied(),
      studyStats.refetch?.()
    ]);
  };

  const getPeriodLabel = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return 'Hoy';
      case 'week': return 'Esta semana';
      case 'month': return 'Este mes';
    }
  };

  const getPeriodIcon = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return <Calendar className="w-4 h-4" />;
      case 'week': return <TrendingUp className="w-4 h-4" />;
      case 'month': return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getStudiedCount = (period: 'day' | 'week' | 'month') => {
    switch (period) {
      case 'day': return studyStats.today;
      case 'week': return studyStats.thisWeek;
      case 'month': return studyStats.thisMonth;
    }
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

  const studiedCount = getStudiedCount(selectedPeriod);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al grupo
        </button>
        
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Estadísticas de {group.name}</h1>
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

      {/* Estadísticas del grupo */}
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
              {getPeriodIcon(selectedPeriod)}
              <span className="text-sm font-medium">
                Estudiadas {selectedPeriod === 'day' ? 'hoy' : selectedPeriod === 'week' ? 'esta semana' : 'este mes'}
              </span>
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
      </div>

      {/* Lista detallada de bases de datos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Bases de datos del grupo</h2>
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
        className="w-full p-4 bg-secondary/30 hover:bg-secondary/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
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
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto bg-background">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-muted-foreground">Cargando flashcards...</span>
            </div>
          ) : flashcards.length > 0 ? (
            flashcards.map((flashcard: { id: string; title: string; state: 'tocado' | 'verde' | 'solido' }) => (
              <FlashcardStatsRow key={flashcard.id} flashcard={flashcard} />
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
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
    <div className="flex items-center justify-between p-3 bg-card rounded border border-border/50 hover:border-border transition-colors">
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
            <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <span className="font-medium">{reviewCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};