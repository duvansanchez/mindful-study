import React, { useState } from 'react';
import { DatabaseGroup, Database, PlanningSession, Flashcard, SessionFolder } from '@/types';
import { CreatePlanningSessionDialog } from '@/components/CreatePlanningSessionDialog';
import { EditPlanningSessionDialog } from '@/components/EditPlanningSessionDialog';
import { PlanningSessionCard } from '@/components/PlanningSessionCard';
import { DeleteSessionDialog } from '@/components/DeleteSessionDialog';
import { SessionFolderDialog } from '@/components/SessionFolderDialog';
import { NotionService } from '@/services/notion';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  GripVertical,
  Loader2,
  BookOpen,
  Folder,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit2,
  Trash2,
  FolderPlus
} from 'lucide-react';
import { usePlanningSessionsByGroup, useReorderPlanningSessions, useDeletePlanningSession, useUpdatePlanningSession } from '@/hooks/usePlanning';
import { useSessionFoldersByGroup, useCreateSessionFolder, useUpdateSessionFolder, useDeleteSessionFolder } from '@/hooks/useSessionFolders';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';

interface PlanningViewProps {
  group: DatabaseGroup;
  databases: Database[];
  onBack: () => void;
  onStartSession?: (databaseId: string, flashcards: Flashcard[], studyMode: string, examId?: string | null) => void;
  onStartAllModes?: (databaseId: string, flashcards: Flashcard[], modes: string[], examId?: string | null) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({
  group,
  databases,
  onBack,
  onStartSession,
  onStartAllModes
}) => {
  const [draggedSession, setDraggedSession] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PlanningSession | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToEdit, setSessionToEdit] = useState<PlanningSession | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  
  // Estados para carpetas
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<SessionFolder | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const { 
    data: sessions = [], 
    isLoading: sessionsLoading 
  } = usePlanningSessionsByGroup(group.id);

  const {
    data: folders = [],
    isLoading: foldersLoading
  } = useSessionFoldersByGroup(group.id);

  const reorderMutation = useReorderPlanningSessions();
  const deleteMutation = useDeletePlanningSession();
  const updateSessionMutation = useUpdatePlanningSession();
  
  const createFolderMutation = useCreateSessionFolder();
  const updateFolderMutation = useUpdateSessionFolder();
  const deleteFolderMutation = useDeleteSessionFolder();

  // Filtrar bases de datos del grupo
  const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));

  const handleEditSession = (session: PlanningSession) => {
    setSessionToEdit(session);
    setEditDialogOpen(true);
  };

  const handleDeleteSession = (session: PlanningSession) => {
    setSessionToDelete(session);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      deleteMutation.mutate(sessionToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setSessionToDelete(null);
        },
        onError: () => {
          // El error se maneja automáticamente por el hook
          setDeleteDialogOpen(false);
          setSessionToDelete(null);
        }
      });
    }
  };

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

  const handleEditFolder = (folder: SessionFolder) => {
    setFolderToEdit(folder);
    setFolderDialogOpen(true);
  };

  const handleDeleteFolder = (folder: SessionFolder) => {
    if (confirm(`¿Estás seguro de eliminar la carpeta "${folder.folderName}"? Las sesiones se moverán fuera de la carpeta.`)) {
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

  // Organizar sesiones por carpetas
  const sessionsWithoutFolder = sessions.filter(s => !s.folderId);
  const sessionsByFolder = folders.reduce((acc, folder) => {
    acc[folder.id] = sessions.filter(s => s.folderId === folder.id);
    return acc;
  }, {} as Record<string, PlanningSession[]>);

  // Drag and drop handlers mejorados para soportar carpetas
  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSession(sessionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('sessionId', sessionId);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedSession) return;

    const draggedIndex = sessions.findIndex(s => s.id === draggedSession);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedSession(null);
      setDragOverIndex(null);
      return;
    }

    // Crear nuevo orden
    const newSessions = [...sessions];
    const [draggedItem] = newSessions.splice(draggedIndex, 1);
    newSessions.splice(dropIndex, 0, draggedItem);

    // Crear array de nuevos órdenes
    const sessionOrders = newSessions.map((session, index) => ({
      sessionId: session.id,
      orderIndex: index + 1
    }));

    // Ejecutar reordenamiento
    reorderMutation.mutate({
      groupId: group.id,
      sessionOrders
    });

    setDraggedSession(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedSession(null);
    setDragOverIndex(null);
  };

  // Mover sesión a carpeta
  const handleDropOnFolder = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sessionId = e.dataTransfer.getData('sessionId');
    if (!sessionId) return;

    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Si ya está en la misma carpeta, no hacer nada
    if (session.folderId === folderId) return;

    // Actualizar la sesión para moverla a la carpeta
    updateSessionMutation.mutate({
      sessionId: session.id,
      updates: {
        folderId: folderId
      }
    }, {
      onSuccess: () => {
        toast.success(folderId 
          ? 'Sesión movida a la carpeta' 
          : 'Sesión movida fuera de la carpeta'
        );
      },
      onError: () => {
        toast.error('Error al mover la sesión');
      }
    });
  };

  const handleFolderDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleStartAllModesSession = async (session: PlanningSession) => {
    if (!onStartAllModes || isStartingSession) return;

    const modes = (session.studyModes && session.studyModes.length > 0)
      ? session.studyModes
      : [session.studyMode as string];

    if (modes.length === 0) return;

    // Check if we need flashcards (any non-exam mode)
    const needsFlashcards = modes.some(m => m !== 'exam');

    setIsStartingSession(true);
    setStartingSessionId(session.id);

    try {
      let flashcards: Flashcard[] = [];

      if (needsFlashcards) {
        const databaseIds = session.databaseIds || (session.databaseId ? [session.databaseId] : []);
        if (databaseIds.length === 0) {
          alert('No hay bases de datos configuradas para esta sesión.');
          return;
        }

        const promises = databaseIds.map(async (dbId) => {
          const cards = await NotionService.getFlashcardsFromDatabase(dbId);
          return cards.map(f => ({ ...f, databaseId: dbId }));
        });

        const results = await Promise.all(promises);
        flashcards = results.flat();

        if (session.selectedFlashcards && session.selectedFlashcards.length > 0) {
          const selectedIds = new Set(session.selectedFlashcards);
          flashcards = flashcards.filter(f => selectedIds.has(f.id));
        }

        if (flashcards.length === 0) {
          alert('No hay flashcards disponibles para esta sesión.');
          return;
        }
      }

      onStartAllModes(session.databaseId, flashcards, modes, session.examId);
    } catch (error) {
      console.error('Error cargando flashcards:', error);
      alert('Error al cargar las flashcards. Intenta de nuevo.');
    } finally {
      setIsStartingSession(false);
      setStartingSessionId(null);
    }
  };

  const handleStartSession = async (session: PlanningSession, selectedMode?: string) => {
    if (!onStartSession || isStartingSession) return;

    const mode = selectedMode || session.studyModes?.[0] || session.studyMode || 'review';

    // Para modo examen no necesitamos cargar flashcards, solo el examId
    if (mode === 'exam') {
      onStartSession(session.databaseId, [], 'exam', session.examId);
      return;
    }

    setIsStartingSession(true);
    setStartingSessionId(session.id);

    try {
      const databaseIds = session.databaseIds || (session.databaseId ? [session.databaseId] : []);

      if (databaseIds.length === 0) {
        alert('No hay bases de datos configuradas para esta sesión.');
        return;
      }

      const promises = databaseIds.map(async (dbId) => {
        const flashcards = await NotionService.getFlashcardsFromDatabase(dbId);
        return flashcards.map(f => ({ ...f, databaseId: dbId }));
      });

      const results = await Promise.all(promises);
      const allFlashcards = results.flat();

      let finalFlashcards = allFlashcards;
      if (session.selectedFlashcards && session.selectedFlashcards.length > 0) {
        const selectedIds = new Set(session.selectedFlashcards);
        finalFlashcards = allFlashcards.filter(f => selectedIds.has(f.id));
      }

      if (finalFlashcards.length === 0) {
        alert('No hay flashcards disponibles para esta sesión.');
        return;
      }

      onStartSession(session.databaseId, finalFlashcards, mode);

    } catch (error) {
      console.error('Error cargando flashcards:', error);
      alert('Error al cargar las flashcards. Intenta de nuevo.');
    } finally {
      setIsStartingSession(false);
      setStartingSessionId(null);
    }
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
          Volver al grupo
        </button>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateFolder}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Nueva carpeta
          </button>
          
          <CreatePlanningSessionDialog 
            group={group} 
            databases={groupDatabases}
          >
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Nueva sesión
            </button>
          </CreatePlanningSessionDialog>
        </div>
      </div>
      
      {/* Información del grupo */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div 
            className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${group.color}20` }}
          >
            <Calendar className="w-8 h-8" style={{ color: group.color }} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Planificación: {group.name}
            </h1>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                <span>{groupDatabases.length} base{groupDatabases.length !== 1 ? 's' : ''} de datos</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{sessions.length} sesión{sessions.length !== 1 ? 'es' : ''} planificada{sessions.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de sesiones con carpetas */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Sesiones de estudio</h2>
          {sessions.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Arrastra para reordenar
            </span>
          )}
        </div>
        
        {sessionsLoading || foldersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Cargando sesiones...</span>
          </div>
        ) : sessions.length > 0 || folders.length > 0 ? (
          <div className="space-y-3">
            {/* Carpetas */}
            {folders.map((folder) => {
              const folderSessions = sessionsByFolder[folder.id] || [];
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
                        ({folderSessions.length})
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
                  
                  {/* Sesiones dentro de la carpeta */}
                  {isExpanded && folderSessions.length > 0 && (
                    <div className="px-4 pb-4 space-y-2">
                      {folderSessions.map((session, index) => (
                        <div 
                          key={session.id} 
                          className="pl-6"
                          draggable
                          onDragStart={(e) => handleDragStart(e, session.id)}
                        >
                          <PlanningSessionCard
                            session={session}
                            databases={groupDatabases}
                            sessionNumber={index + 1}
                            onEdit={handleEditSession}
                            onDelete={handleDeleteSession}
                            onStartSession={handleStartSession}
                            onStartAllModes={onStartAllModes ? handleStartAllModesSession : undefined}
                            isStarting={startingSessionId === session.id}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Sesiones sin carpeta */}
            {sessionsWithoutFolder.length > 0 && (
              <div 
                className="space-y-3"
                onDragOver={handleFolderDragOver}
                onDrop={(e) => handleDropOnFolder(e, null)}
              >
                {sessionsWithoutFolder.map((session, index) => (
                  <div
                    key={session.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, session.id)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`
                      relative transition-all duration-200
                      ${draggedSession === session.id ? 'opacity-50 scale-95' : ''}
                      ${dragOverIndex === index ? 'transform translate-y-1' : ''}
                    `}
                  >
                    {dragOverIndex === index && (
                      <div className="absolute -top-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                    
                    <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-move">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-sm font-medium min-w-[2rem] text-center">
                          {index + 1}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <PlanningSessionCard
                          session={session}
                          databases={groupDatabases}
                          sessionNumber={index + 1}
                          onEdit={handleEditSession}
                          onDelete={handleDeleteSession}
                          onStartSession={handleStartSession}
                          onStartAllModes={onStartAllModes ? handleStartAllModesSession : undefined}
                          isStarting={startingSessionId === session.id}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                Sin sesiones planificadas
              </h3>
              <p className="text-muted-foreground mb-6">
                Crea tu primera sesión de estudio para organizar tu aprendizaje 
                de manera estructurada.
              </p>
              <CreatePlanningSessionDialog 
                group={group} 
                databases={groupDatabases}
              >
                <button className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                  <Plus className="w-4 h-4" />
                  Crear primera sesión
                </button>
              </CreatePlanningSessionDialog>
            </div>
          </div>
        )}
      </section>

      {/* Diálogo de confirmación de eliminación */}
      <DeleteSessionDialog
        session={sessionToDelete}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteMutation.isPending}
      />

      {/* Diálogo de edición de sesión */}
      <EditPlanningSessionDialog
        session={sessionToEdit}
        group={group}
        databases={groupDatabases}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          setEditDialogOpen(false);
          setSessionToEdit(null);
        }}
      />

      {/* Diálogo de carpetas */}
      <SessionFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        folder={folderToEdit}
        onSave={handleSaveFolder}
        isLoading={createFolderMutation.isPending || updateFolderMutation.isPending}
      />
    </div>
  );
};