import React, { useState, useEffect } from 'react';
import { DatabaseGroup, Database, GroupFolder } from '@/types';
import { DatabaseCard } from './DatabaseCard';
import { SessionFolderDialog } from './SessionFolderDialog';
import { GoalsAlertDialog } from './GoalsAlertDialog';
import { 
  ArrowLeft, 
  Folder, 
  BarChart3, 
  BookOpen, 
  Edit3,
  Settings,
  Calendar,
  Target,
  Loader2,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  ClipboardList
} from 'lucide-react';
import { useGroupFoldersByGroup, useCreateGroupFolder, useUpdateGroupFolder, useDeleteGroupFolder } from '@/hooks/useGroupFolders';
import { useMoveDatabaseToFolder, useGroupDatabases } from '@/hooks/useGroups';
import { usePendingGoalsCount } from '@/hooks/useGroupGoals';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface GroupDetailViewProps {
  group: DatabaseGroup;
  databases: Database[];
  databasesLoading?: boolean;
  onBack: () => void;
  onDatabaseClick: (databaseId: string) => void;
  onEditGroup: (group: DatabaseGroup) => void;
  onShowGroupStats: (group: DatabaseGroup) => void;
  onShowGroupGoals: (group: DatabaseGroup) => void;
  onShowGroupPlanning: (group: DatabaseGroup) => void;
  onShowGroupExams: (group: DatabaseGroup) => void;
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
  onShowGroupGoals,
  onShowGroupPlanning,
  onShowGroupExams,
  databaseCounts
}) => {
  // Estados para carpetas
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<GroupFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [draggedDatabase, setDraggedDatabase] = useState<string | null>(null);
  const [goalsAlertOpen, setGoalsAlertOpen] = useState(false);

  const {
    data: folders = [],
    isLoading: foldersLoading
  } = useGroupFoldersByGroup(group.id);

  const {
    data: groupDatabasesInfo = [],
    isLoading: groupDatabasesLoading
  } = useGroupDatabases(group.id);

  const {
    data: pendingGoalsCount = 0,
    isLoading: pendingGoalsLoading
  } = usePendingGoalsCount(group.id);

  const createFolderMutation = useCreateGroupFolder();
  const updateFolderMutation = useUpdateGroupFolder();
  const deleteFolderMutation = useDeleteGroupFolder();
  const moveDatabaseMutation = useMoveDatabaseToFolder();

  // Mostrar alerta emergente cuando hay metas pendientes
  useEffect(() => {
    if (!pendingGoalsLoading && pendingGoalsCount > 0) {
      setGoalsAlertOpen(true);
    }
  }, [pendingGoalsCount, pendingGoalsLoading]);

  // Combinar información de databases (de Notion) con groupDatabasesInfo (de SQL con folderId)
  const groupDatabases = databases
    .filter(db => group.databaseIds.includes(db.id))
    .map(db => {
      const dbInfo = groupDatabasesInfo.find((info: any) => info.id === db.id);
      return {
        ...db,
        folderId: dbInfo?.folderId || null
      };
    });
  
  // Calcular estadísticas del grupo
  const totalDatabases = groupDatabases.length;
  const totalCards = groupDatabases.reduce((sum, db) => {
    return sum + (databaseCounts[db.id] ?? db.cardCount);
  }, 0);

  // Funciones para manejar carpetas
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleCreateFolder = () => {
    setFolderToEdit(null);
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folder: GroupFolder) => {
    setFolderToEdit(folder);
    setFolderDialogOpen(true);
  };

  const handleDeleteFolder = (folder: GroupFolder) => {
    if (confirm(`¿Estás seguro de eliminar la carpeta "${folder.folderName}"?`)) {
      deleteFolderMutation.mutate(folder.id, {
        onSuccess: () => {
          toast.success('Carpeta eliminada correctamente');
        },
        onError: () => {
          toast.error('Error al eliminar la carpeta');
        }
      });
    }
  };

  const handleSaveFolder = (data: { folderName: string; color: string; icon: string }) => {
    if (folderToEdit) {
      // Editar carpeta existente
      updateFolderMutation.mutate({
        folderId: folderToEdit.id,
        updates: data
      }, {
        onSuccess: () => {
          toast.success('Carpeta actualizada correctamente');
          setFolderDialogOpen(false);
          setFolderToEdit(null);
        },
        onError: () => {
          toast.error('Error al actualizar la carpeta');
        }
      });
    } else {
      // Crear nueva carpeta
      createFolderMutation.mutate({
        groupId: group.id,
        data
      }, {
        onSuccess: () => {
          toast.success('Carpeta creada correctamente');
          setFolderDialogOpen(false);
        },
        onError: () => {
          toast.error('Error al crear la carpeta');
        }
      });
    }
  };

  // Organizar bases de datos por carpetas
  const databasesWithoutFolder = groupDatabases.filter(db => !db.folderId);
  const databasesByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = groupDatabases.filter(db => db.folderId === folder.id);
    return acc;
  }, {} as Record<string, Database[]>);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, databaseId: string) => {
    setDraggedDatabase(databaseId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('databaseId', databaseId);
  };

  const handleDropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const databaseId = e.dataTransfer.getData('databaseId');
    if (!databaseId) return;

    const database = groupDatabases.find(db => db.id === databaseId);
    if (!database) return;

    // Si ya está en la misma carpeta, no hacer nada
    if (database.folderId === folderId) return;

    // Mover la base de datos a la carpeta
    moveDatabaseMutation.mutate({
      groupId: group.id,
      databaseId: database.id,
      folderId: folderId
    }, {
      onSuccess: () => {
        toast.success(folderId 
          ? 'Base de datos movida a la carpeta' 
          : 'Base de datos movida fuera de la carpeta'
        );
      },
      onError: () => {
        toast.error('Error al mover la base de datos');
      }
    });

    setDraggedDatabase(null);
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = () => {
    setDraggedDatabase(null);
  };

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          onClick={() => onShowGroupGoals(group)}
          className="group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50 text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-medium text-foreground">Metas y Objetivos</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Establece y gestiona objetivos de aprendizaje para este grupo
          </p>
        </button>

        <button
          onClick={() => onShowGroupPlanning(group)}
          disabled={databasesLoading || foldersLoading || groupDatabasesLoading}
          title={databasesLoading || foldersLoading || groupDatabasesLoading ? 'Espera a que carguen las bases de datos' : undefined}
          className="group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-border"
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

        <button
          onClick={() => onShowGroupExams(group)}
          disabled={databasesLoading || foldersLoading || groupDatabasesLoading}
          title={databasesLoading || foldersLoading || groupDatabasesLoading ? 'Espera a que carguen las bases de datos' : undefined}
          className="group p-4 bg-card border border-border rounded-lg hover:shadow-md transition-all duration-200 hover:border-primary/50 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:border-border"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <ClipboardList className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-medium text-foreground">Exámenes</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Crea y realiza exámenes de evaluación para este grupo
          </p>
        </button>
      </div>

      {/* Bases de datos del grupo */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Bases de datos</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateFolder}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <FolderPlus className="w-4 h-4" />
              Nueva carpeta
            </button>
            <span className="text-sm text-muted-foreground">
              {totalDatabases} base{totalDatabases !== 1 ? 's' : ''} de datos
            </span>
          </div>
        </div>
        
        {databasesLoading || foldersLoading || groupDatabasesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Cargando bases de datos...</span>
          </div>
        ) : groupDatabases.length > 0 || folders.length > 0 ? (
          <div className="space-y-4">
            {/* Carpetas */}
            {folders.map((folder) => {
              const folderDatabases = databasesByFolder[folder.id] || [];
              const isExpanded = expandedFolders.has(folder.id);
              
              return (
                <div 
                  key={folder.id} 
                  className="bg-card border border-border rounded-lg overflow-hidden"
                  onDragOver={handleFolderDragOver}
                  onDrop={(e) => handleDropOnFolder(e, folder.id)}
                >
                  {/* Header de la carpeta */}
                  <div className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="flex items-center gap-2 flex-1 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <span className="text-xl">{folder.icon}</span>
                      <span 
                        className="font-medium"
                        style={{ color: folder.color }}
                      >
                        {folder.folderName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({folderDatabases.length})
                      </span>
                    </button>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar carpeta
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteFolder(folder)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar carpeta
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Bases de datos dentro de la carpeta */}
                  {isExpanded && folderDatabases.length > 0 && (
                    <div className="px-4 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {folderDatabases.map(database => {
                          const actualCount = databaseCounts[database.id] ?? database.cardCount;
                          const databaseWithCount = { ...database, cardCount: actualCount };
                          
                          return (
                            <div
                              key={database.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, database.id)}
                              onDragEnd={handleDragEnd}
                              className={`
                                transition-opacity duration-200
                                ${draggedDatabase === database.id ? 'opacity-50' : ''}
                              `}
                            >
                              <DatabaseCard
                                database={databaseWithCount}
                                onClick={() => onDatabaseClick(database.id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Bases de datos sin carpeta */}
            {databasesWithoutFolder.length > 0 && (
              <div 
                className="space-y-4"
                onDragOver={handleFolderDragOver}
                onDrop={(e) => handleDropOnFolder(e, null)}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {databasesWithoutFolder.map(database => {
                    const actualCount = databaseCounts[database.id] ?? database.cardCount;
                    const databaseWithCount = { ...database, cardCount: actualCount };
                    
                    return (
                      <div
                        key={database.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, database.id)}
                        onDragEnd={handleDragEnd}
                        className={`
                          transition-opacity duration-200
                          ${draggedDatabase === database.id ? 'opacity-50' : ''}
                        `}
                      >
                        <DatabaseCard
                          database={databaseWithCount}
                          onClick={() => onDatabaseClick(database.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Diálogo de carpetas */}
      <SessionFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={folderToEdit}
        onSave={handleSaveFolder}
        isLoading={createFolderMutation.isPending || updateFolderMutation.isPending}
      />

      {/* Diálogo de alerta de metas pendientes */}
      <GoalsAlertDialog
        open={goalsAlertOpen}
        onOpenChange={setGoalsAlertOpen}
        pendingCount={pendingGoalsCount}
        groupName={group.name}
        onViewGoals={() => onShowGroupGoals(group)}
      />
    </div>
  );
};