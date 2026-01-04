import React, { useState } from 'react';
import { DatabaseGroup, Database, PlanningSession, Flashcard } from '@/types';
import { CreatePlanningSessionDialog } from './CreatePlanningSessionDialog';
import { PlanningSessionCard } from './PlanningSessionCard';
import { DeleteSessionDialog } from './DeleteSessionDialog';
import { useSessionFlashcards } from '@/hooks/useSessionFlashcards';
import { 
  ArrowLeft, 
  Calendar, 
  Plus, 
  GripVertical,
  Loader2,
  BookOpen
} from 'lucide-react';
import { usePlanningSessionsByGroup, useReorderPlanningSessions, useDeletePlanningSession } from '@/hooks/usePlanning';

interface PlanningViewProps {
  group: DatabaseGroup;
  databases: Database[];
  onBack: () => void;
  onStartSession?: (databaseId: string, flashcards: Flashcard[], studyMode: string) => void;
}

export const PlanningView: React.FC<PlanningViewProps> = ({
  group,
  databases,
  onBack,
  onStartSession
}) => {
  const [draggedSession, setDraggedSession] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<PlanningSession | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToStart, setSessionToStart] = useState<PlanningSession | null>(null);

  const { 
    data: sessions = [], 
    isLoading: sessionsLoading 
  } = usePlanningSessionsByGroup(group.id);

  const reorderMutation = useReorderPlanningSessions();
  const deleteMutation = useDeletePlanningSession();

  // Hook para obtener flashcards de la sesión que se va a iniciar
  const { data: sessionFlashcards = [], isLoading: flashcardsLoading } = useSessionFlashcards(sessionToStart);

  // Filtrar bases de datos del grupo
  const groupDatabases = databases.filter(db => group.databaseIds.includes(db.id));

  const handleEditSession = (session: PlanningSession) => {
    // TODO: Implementar edición
    console.log('Editar sesión:', session);
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

  const handleStartSession = (session: PlanningSession) => {
    console.log('🚀 Iniciando sesión:', {
      sessionId: session.id,
      sessionName: session.sessionName,
      databaseId: session.databaseId,
      studyMode: session.studyMode,
      selectedFlashcards: session.selectedFlashcards?.length || 0
    });
    setSessionToStart(session);
  };

  // Efecto para iniciar la sesión cuando las flashcards estén listas
  React.useEffect(() => {
    if (sessionToStart && !flashcardsLoading && onStartSession) {
      console.log('🎯 Flashcards listas para la sesión:', {
        sessionId: sessionToStart.id,
        sessionName: sessionToStart.sessionName,
        databaseId: sessionToStart.databaseId,
        studyMode: sessionToStart.studyMode,
        flashcardsCount: sessionFlashcards.length,
        selectedFlashcardsCount: sessionToStart.selectedFlashcards?.length || 0
      });
      
      // Llamar a la función de inicio de sesión con los datos necesarios
      // Incluso si no hay flashcards, permitir que el modo de estudio maneje la situación
      onStartSession(sessionToStart.databaseId, sessionFlashcards, sessionToStart.studyMode);
      
      // Limpiar el estado
      setSessionToStart(null);
    }
  }, [sessionToStart, sessionFlashcards, flashcardsLoading, onStartSession]);

  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    setDraggedSession(sessionId);
    e.dataTransfer.effectAllowed = 'move';
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

      {/* Lista de sesiones */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Sesiones de estudio</h2>
          {sessions.length > 0 && (
            <span className="text-sm text-muted-foreground">
              Arrastra para reordenar
            </span>
          )}
        </div>
        
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Cargando sesiones...</span>
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session, index) => (
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
                      database={groupDatabases.find(db => db.id === session.databaseId)}
                      sessionNumber={index + 1}
                      onEdit={handleEditSession}
                      onDelete={handleDeleteSession}
                      onStartSession={handleStartSession}
                    />
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
};