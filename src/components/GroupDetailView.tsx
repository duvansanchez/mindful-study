import React from 'react';
import { DatabaseGroup, Database } from '@/types';
import { DatabaseCard } from './DatabaseCard';
import { 
  ArrowLeft, 
  Folder, 
  BarChart3, 
  BookOpen, 
  Edit3,
  Settings,
  Calendar,
  Target,
  Loader2
} from 'lucide-react';

interface GroupDetailViewProps {
  group: DatabaseGroup;
  databases: Database[];
  databasesLoading?: boolean;
  onBack: () => void;
  onDatabaseClick: (databaseId: string) => void;
  onEditGroup: (group: DatabaseGroup) => void;
  onShowGroupStats: (group: DatabaseGroup) => void;
  onShowGroupPlanning: (group: DatabaseGroup) => void;
  databaseCounts: Record<string, number>;
}

export const GroupDetailView: React.FC<GroupDetailViewProps> = ({
  group,
  databases,
  databasesLoading = false,
  onBack,
  onDatabaseClick,
  onEditGroup,
  onShowGroupStats,
  onShowGroupPlanning,
  databaseCounts
}) => {
  const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));
  
  // Calcular estadísticas del grupo
  const totalDatabases = groupDatabases.length;
  const totalCards = groupDatabases.reduce((sum, db) => {
    return sum + (databaseCounts[db.id] ?? db.cardCount);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header con navegación */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>
        
        <button
          onClick={() => onEditGroup(group)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Editar agrupación
        </button>
      </div>
      
      {/* Información del grupo */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <Folder className="w-8 h-8" style={{ color: group.color }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">{group.name}</h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{totalDatabases} base{totalDatabases !== 1 ? 's' : ''} de datos</span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4" />
                <span>{totalCards} tarjeta{totalCards !== 1 ? 's' : ''} total{totalCards !== 1 ? 'es' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas del grupo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button 
          onClick={() => onShowGroupStats(group)}
          className="group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-medium text-foreground">Estadísticas del grupo</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Ve el progreso y estadísticas específicas de esta agrupación
          </p>
        </button>

        <button 
          onClick={() => onShowGroupPlanning(group)}
          className="group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-medium text-foreground">Planificación</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Programa sesiones de estudio para este grupo
          </p>
        </button>
      </div>

      {/* Bases de datos del grupo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Bases de datos</h2>
          <span className="text-sm text-muted-foreground">
            {totalDatabases} base{totalDatabases !== 1 ? 's' : ''} de datos
          </span>
        </div>
        
        {databasesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Cargando bases de datos...</span>
          </div>
        ) : groupDatabases.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupDatabases.map(database => {
              const actualCount = databaseCounts[database.id] ?? database.cardCount;
              const databaseWithCount = { ...database, cardCount: actualCount };
              
              return (
                <DatabaseCard
                  key={database.id}
                  database={databaseWithCount}
                  onClick={() => onDatabaseClick(database.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-card border border-border rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Sin bases de datos
              </h3>
              <p className="text-muted-foreground mb-4">
                Esta agrupación no tiene bases de datos asociadas. 
                Edita la agrupación para agregar bases de datos.
              </p>
              <button 
                onClick={() => onEditGroup(group)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configurar agrupación
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};