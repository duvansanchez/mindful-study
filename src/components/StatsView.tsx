import React, { useState } from 'react';
import { ArrowLeft, BarChart3, Calendar, TrendingUp, Clock } from 'lucide-react';
import { DatabaseGroup } from '@/types';
import { useGroups, useGroupStats } from '@/hooks/useGroups';
import { useNotionDatabases } from '@/hooks/useNotion';
import { useMultiPeriodStats, useLastStudyDate } from '@/hooks/useStudyTracking';
import { StateBadge } from './StateBadge';

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

const GroupStatsCard: React.FC<GroupStatsCardProps> = ({ 
  group, 
  period,
  databases 
}) => {
  const { data: groupStats, isLoading: isLoadingStats, refetch: refetchStats } = useGroupStats(group.id);
  const studyStats = useMultiPeriodStats(group.id);
  const { data: lastStudied, refetch: refetchLastStudied } = useLastStudyDate(group.id);
  
  // Función para refrescar todas las estadísticas
  const handleRefreshAll = async () => {
    await Promise.all([
      refetchStats(),
      refetchLastStudied(),
      // También invalidar las estadísticas de estudio
      studyStats.refetch?.()
    ]);
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
              {databases.filter(db => group.databaseIds.includes(db.id)).length} bases de datos
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
          <p className="text-2xl font-bold">{(groupStats as any)?.total || 0}</p>
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
              <p className="text-lg font-semibold mt-1">{(groupStats as any)?.tocado || 0}</p>
            </div>
            <div className="text-center">
              <StateBadge state="verde" size="sm" />
              <p className="text-lg font-semibold mt-1">{(groupStats as any)?.verde || 0}</p>
            </div>
            <div className="text-center">
              <StateBadge state="solido" size="sm" />
              <p className="text-lg font-semibold mt-1">{(groupStats as unknown)?.solido || 0}</p>
            </div>
          </div>
        </div>
      ) : null}
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