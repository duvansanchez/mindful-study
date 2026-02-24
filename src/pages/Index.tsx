import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { HomeView } from "@/components/HomeView";
import { GroupsView } from "@/components/GroupsView";
import { GroupDetailView } from "@/components/GroupDetailView";
import { GroupStatsDetailView } from "@/components/GroupStatsDetailView";
import { GroupGoalsView } from "@/components/GroupGoalsView";
import { PlanningView } from "@/components/PlanningView";
import { GroupGeneralInfoView } from "@/components/GroupGeneralInfoView";
import { ExamsView } from "@/components/ExamsView";
import { ExamMode } from "@/components/ExamMode";
import { ExamResults } from "@/components/ExamResults";
import { StatsView } from "@/components/StatsView";
import { SmartReviewView } from "@/components/SmartReviewView";
import { SessionSummaryView, SessionSummaryData, SessionEntry } from "@/components/SessionSummaryView";
import { ReviewSetup } from "@/components/ReviewSetup";
import { FlashcardReview } from "@/components/FlashcardReview";
import MatchingMode from "@/components/MatchingMode";
import { OverviewMode } from "@/components/OverviewMode";
import { ModeSelection } from "@/components/ModeSelection";
import { NotionSetup } from "@/components/NotionSetup";
import { EditGroupDialog } from "@/components/EditGroupDialog";
import { DeleteGroupDialog } from "@/components/DeleteGroupDialog";
import { useNotionDatabases, useNotionFlashcards, useNotionConnection, useNotionStats, useUpdateFlashcardState, useUpdateFlashcardReviewDate } from "@/hooks/useNotion";
import { useGroups } from "@/hooks/useGroups";
import { useRecordStudySession } from "@/hooks/useStudyTracking";
import { KnowledgeState, Flashcard, DatabaseGroup } from "@/types";
import { AlertCircle, Loader2, WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

type View = 'home' | 'groups' | 'groups-general-info' | 'stats' | 'smart-review' | 'settings' | 'group-detail' | 'group-stats' | 'group-goals' | 'planning' | 'exams' | 'exam-player' | 'exam-results' | 'mode-selection' | 'review-setup' | 'review' | 'matching' | 'overview' | 'notion-setup' | 'session-summary';

const Index = () => {
  const [view, setView] = useState<View>('home');
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DatabaseGroup | null>(null);
  const [reviewCards, setReviewCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardsToRepeat, setCardsToRepeat] = useState<Flashcard[]>([]); // Nuevas flashcards para repetir al final
  const [databaseCounts, setDatabaseCounts] = useState<Record<string, number>>({});
  const [studyStartTime, setStudyStartTime] = useState<Date | null>(null);
  const [previousView, setPreviousView] = useState<View>('home'); // Para recordar de dónde venía
  const [pendingMode, setPendingMode] = useState<'review' | 'matching'>('review'); // Para saber qué modo se va a iniciar
  const [isPlannedSession, setIsPlannedSession] = useState(false); // Para distinguir sesiones planificadas

  // Session summary
  const [sessionAbsoluteStart, setSessionAbsoluteStart] = useState<Date | null>(null);
  const [sessionSnapshot, setSessionSnapshot] = useState<Map<string, KnowledgeState>>(new Map());
  const [sessionSummaryData, setSessionSummaryData] = useState<SessionSummaryData | null>(null);

  // Estados para los diálogos de agrupaciones
  const [editingGroup, setEditingGroup] = useState<DatabaseGroup | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<DatabaseGroup | null>(null);

  // Estados para exámenes
  const [currentExamId, setCurrentExamId] = useState<string | null>(null);
  const [currentExamName, setCurrentExamName] = useState<string>('');
  const [currentExamQuestions, setCurrentExamQuestions] = useState<any[]>([]);
  const [currentExamTimeLimit, setCurrentExamTimeLimit] = useState<number>(0);
  const [examAnswers, setExamAnswers] = useState<Record<string | number, string>>({});
  const [examResults, setExamResults] = useState<any>(null);
  const [examDuration, setExamDuration] = useState<number>(0);

  // Notion hooks - Cargar bases de datos siempre al inicio
  const { data: databases = [], isLoading: databasesLoading } = useNotionDatabases(true);
  const { data: flashcards = [], isLoading: flashcardsLoading } = useNotionFlashcards(selectedDatabaseId);
  const { data: isConnected = false, isLoading: connectionLoading } = useNotionConnection();
  const updateFlashcardMutation = useUpdateFlashcardState();
  const updateReviewDateMutation = useUpdateFlashcardReviewDate();
  const recordStudySession = useRecordStudySession();

  // Groups hooks
  const { data: groups = [], isLoading: groupsLoading } = useGroups();

  // Update database count when flashcards are loaded
  useEffect(() => {
    if (selectedDatabaseId && flashcards.length > 0) {
      setDatabaseCounts(prev => ({
        ...prev,
        [selectedDatabaseId]: flashcards.length
      }));
    }
  }, [selectedDatabaseId, flashcards.length]);

  // Calculate stats with real flashcard data
  const flashcardsStats = useNotionStats(flashcards);
  const reviewSetupStats = useNotionStats(flashcards);

  const selectedDatabase = databases.find(db => db.id === selectedDatabaseId);

  // Navigation handler
  const handleNavigate = (newView: string) => {
    switch (newView) {
      case 'home':
        setView('home');
        setSelectedGroup(null);
        setSelectedDatabaseId(null);
        break;
      case 'groups':
        setView('groups');
        break;
      case 'stats':
        setView('stats');
        break;
      case 'smart-review':
        setView('smart-review');
        break;
      case 'settings':
        // Por ahora, solo mostrar un mensaje
        alert('Configuración estará disponible próximamente');
        break;
      default:
        setView(newView as View);
    }
  };

  const handleGroupClick = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('group-detail');
  };

  const handleShowGroupStats = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('group-stats');
  };

  const handleShowGroupGoals = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('group-goals');
  };

  const handleShowGroupPlanning = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('planning');
  };

  const handleShowGroupExams = (group: DatabaseGroup) => {
    setSelectedGroup(group);
    setView('exams');
  };

  const handleBackToHome = () => {
    setView('home');
    setSelectedGroup(null);
    setSelectedDatabaseId(null);
  };

  const handleSessionSummaryGoHome = () => {
    setSessionSummaryData(null);
    setView('home');
    setSelectedGroup(null);
  };

  const handleSessionSummaryGoSmartReview = () => {
    setSessionSummaryData(null);
    setView('smart-review');
  };

  const handleDatabaseClick = (databaseId: string) => {
    setSelectedDatabaseId(databaseId);
    setPreviousView(view); // Recordar de dónde venía
    setView('mode-selection');
  };

  const handleStartActiveReview = () => {
    setPendingMode('review'); // Configurar modo de repaso
    setView('review-setup');
  };

  const handleStartOverviewMode = () => {
    setIsPlannedSession(false); // Marcar que NO es una sesión planificada
    setView('overview');
  };

  const handleReviewSingleCard = (card: Flashcard) => {
    setReviewCards([card]);
    setCurrentCardIndex(0);
    setCardsToRepeat([]);
    setStudyStartTime(new Date());
    setIsPlannedSession(true);
    setPreviousView('overview');
    setView('review');
  };

  const handleStartMatchingMode = () => {
    setPendingMode('matching'); // Configurar modo matching
    setView('review-setup'); // Ir a la configuración primero
  };

  const handleStartReview = (selectedCards: Flashcard[]) => {
    setReviewCards(selectedCards);
    setCurrentCardIndex(0);
    const now = new Date();
    setStudyStartTime(now); // Iniciar tracking de tiempo (por tarjeta)
    setSessionAbsoluteStart(now); // Inicio absoluto de la sesión completa
    setSessionSnapshot(new Map(selectedCards.map(c => [c.id, c.state])));
    
    // Decidir a qué vista ir según el modo pendiente
    if (pendingMode === 'matching') {
      setView('matching');
    } else {
      setView('review');
    }
  };

  const handleStateChange = async (newState: KnowledgeState) => {
    const currentCard = reviewCards[currentCardIndex];
    const previousState = currentCard.state;
    
    // Registrar tiempo de inicio si no existe
    if (!studyStartTime) {
      setStudyStartTime(new Date());
    }
    
    try {
      const result = await updateFlashcardMutation.mutateAsync({
        flashcardId: currentCard.id,
        newState,
      });
      
      // Update local state only if successful
      if (result.success) {
        setReviewCards(prev => prev.map(c => 
          c.id === currentCard.id ? { ...c, state: newState } : c
        ));

        // Solo registrar el cambio de estado si es diferente
        if (previousState !== newState) {
          const studyDuration = studyStartTime 
            ? Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000)
            : 0;

          // Encontrar el grupo al que pertenece esta base de datos
          const currentGroup = groups.find(group => 
            group.databaseIds.includes(currentCard.databaseId)
          );

          console.log('📊 Registrando cambio de estado:', {
            flashcardId: currentCard.id,
            databaseId: currentCard.databaseId,
            groupId: currentGroup?.id,
            previousState,
            newState,
            studyDurationSeconds: studyDuration,
          });

          recordStudySession.mutate({
            flashcardId: currentCard.id,
            databaseId: currentCard.databaseId,
            groupId: currentGroup?.id,
            previousState,
            newState,
            studyDurationSeconds: studyDuration,
          });
        }
      }
      
      // Retornar el resultado completo incluyendo mensajes de error
      return { 
        success: result.success, 
        updated: result.updated,
        dominioMessage: result.dominioMessage 
      };
    } catch (error) {
      console.error('Error updating flashcard state:', error);
      toast.error('Error al actualizar el estado de la tarjeta');
      return { success: false };
    }
  };

  const endSessionWithSummary = (finalReviewCards: Flashcard[]) => {
    const totalDuration = sessionAbsoluteStart
      ? Math.floor((new Date().getTime() - sessionAbsoluteStart.getTime()) / 1000)
      : 0;

    // Deduplicate by id — keep final state of each unique card
    const uniqueCards = Array.from(new Map(finalReviewCards.map(c => [c.id, c])).values());

    const entries: SessionEntry[] = uniqueCards.map(card => ({
      id: card.id,
      title: card.title,
      originalState: sessionSnapshot.get(card.id) ?? card.state,
      finalState: card.state,
      groupName: groups.find(g => g.databaseIds.includes(card.databaseId))?.name,
    }));

    setSessionSummaryData({
      entries,
      totalDurationSeconds: totalDuration,
      groupName: selectedGroup?.name,
    });

    setView('session-summary');
    setSelectedDatabaseId(null);
    setStudyStartTime(null);
    setSessionAbsoluteStart(null);
    setReviewCards([]);
    setCurrentCardIndex(0);
    setCardsToRepeat([]);
    setIsPlannedSession(false);
  };

  const handleNextCard = async () => {
    // Actualizar fecha de repaso de la tarjeta actual antes de pasar a la siguiente
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard) {
      try {
        console.log('📅 Actualizando fecha de repaso al pasar a siguiente tarjeta:', currentCard.id);
        await updateReviewDateMutation.mutateAsync(currentCard.id);

        // Registrar sesión de estudio AQUÍ - cada vez que pasas una flashcard
        const studyDuration = studyStartTime 
          ? Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000)
          : 0;

        // Encontrar el grupo al que pertenece esta base de datos
        const currentGroup = groups.find(group => 
          group.databaseIds.includes(currentCard.databaseId)
        );

        console.log('📊 Registrando sesión de estudio al pasar flashcard:', {
          flashcardId: currentCard.id,
          databaseId: currentCard.databaseId,
          groupId: currentGroup?.id,
          previousState: currentCard.state, // El estado actual (puede haber cambiado)
          newState: currentCard.state, // Mismo estado (solo estamos pasando la tarjeta)
          studyDurationSeconds: studyDuration,
        });

        recordStudySession.mutate({
          flashcardId: currentCard.id,
          databaseId: currentCard.databaseId,
          groupId: currentGroup?.id,
          previousState: currentCard.state,
          newState: currentCard.state, // Mismo estado, solo registramos que se estudió
          studyDurationSeconds: studyDuration,
        });

      } catch (error) {
        console.error('Error updating review date:', error);
        toast.error('No se pudo actualizar la fecha de repaso', { duration: 2000 });
      }
    }
    
    // Pasar a la siguiente tarjeta o agregar las repeticiones al final
    if (currentCardIndex < reviewCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setStudyStartTime(new Date()); // Reiniciar tiempo para la nueva tarjeta
    } else {
      // Es la última tarjeta de la lista original
      if (cardsToRepeat.length > 0) {
        // Agregar las flashcards para repetir al final de la lista
        console.log('🔄 Agregando', cardsToRepeat.length, 'flashcards para repetir al final');
        setReviewCards(prev => [...prev, ...cardsToRepeat]);
        setCardsToRepeat([]); // Limpiar la lista de repeticiones
        setCurrentCardIndex(prev => prev + 1); // Ir a la primera flashcard repetida
        setStudyStartTime(new Date());
      } else {
        // No hay más flashcards para repetir, terminar el repaso
        endSessionWithSummary(reviewCards);
      }
    }
  };

  const handlePreviousCard = () => {
    // Ir a la tarjeta anterior si no estamos en la primera
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleRepeatCard = () => {
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard) {
      // Verificar si la flashcard ya está en la lista de repeticiones
      const isAlreadyInRepeatList = cardsToRepeat.some(card => card.id === currentCard.id);
      
      if (!isAlreadyInRepeatList) {
        console.log('🔄 Marcando flashcard para repetir al final:', currentCard.title);
        setCardsToRepeat(prev => [...prev, currentCard]);
      }
      
      // Continuar con la siguiente flashcard (igual que handleNextCard pero sin actualizar fecha de repaso)
      if (currentCardIndex < reviewCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setStudyStartTime(new Date());
      } else {
        // Es la última tarjeta de la lista original
        if (cardsToRepeat.length > 0) {
          // Agregar las flashcards para repetir al final de la lista
          console.log('🔄 Agregando', cardsToRepeat.length, 'flashcards para repetir al final');
          setReviewCards(prev => [...prev, ...cardsToRepeat]);
          setCardsToRepeat([]);
          setCurrentCardIndex(prev => prev + 1);
          setStudyStartTime(new Date());
        } else {
          // No hay más flashcards para repetir, terminar el repaso
          endSessionWithSummary(reviewCards);
        }
      }
    }
  };

  const handleCloseReview = () => {
    // Registrar la tarjeta actual antes de cerrar si hay una
    const currentCard = reviewCards[currentCardIndex];
    if (currentCard && studyStartTime) {
      const studyDuration = Math.floor((new Date().getTime() - studyStartTime.getTime()) / 1000);
      const currentGroup = groups.find(group => 
        group.databaseIds.includes(currentCard.databaseId)
      );

      console.log('📊 Registrando sesión de estudio al cerrar repaso:', {
        flashcardId: currentCard.id,
        databaseId: currentCard.databaseId,
        groupId: currentGroup?.id,
        previousState: currentCard.state,
        newState: currentCard.state,
        studyDurationSeconds: studyDuration,
      });

      recordStudySession.mutate({
        flashcardId: currentCard.id,
        databaseId: currentCard.databaseId,
        groupId: currentGroup?.id,
        previousState: currentCard.state,
        newState: currentCard.state,
        studyDurationSeconds: studyDuration,
      });
    }

    // Regresar a la vista anterior y limpiar estados
    setView(previousView);
    // Preservar selectedDatabaseId si regresamos a una vista que lo necesita
    if (previousView !== 'overview' && previousView !== 'mode-selection') {
      setSelectedDatabaseId(null);
    }
    setReviewCards([]);
    setCurrentCardIndex(0);
    setCardsToRepeat([]); // Limpiar flashcards para repetir
    setStudyStartTime(null);
    setIsPlannedSession(false); // Limpiar el estado de sesión planificada
  };

  const handleCloseModeSelection = () => {
    // Regresar a la vista anterior
    setView(previousView);
    setSelectedDatabaseId(null);
    setIsPlannedSession(false); // Limpiar el estado de sesión planificada
  };

  const handleCloseOverview = () => {
    // Regresar a la vista anterior
    setView(previousView);
    setSelectedDatabaseId(null);
    setIsPlannedSession(false); // Limpiar el estado de sesión planificada
  };

  // Handlers para exámenes
  const handleStartExam = (examId: string, examName: string, questions: any[], timeLimit: number) => {
    setCurrentExamId(examId);
    setCurrentExamName(examName);
    setCurrentExamQuestions(questions);
    setCurrentExamTimeLimit(timeLimit);
    setExamAnswers({});
    setPreviousView(view);
    setView('exam-player');
  };

  const handleExamSubmit = (answers: Record<string | number, string>, duration: number) => {
    // Calcular resultados
    const correct = Object.entries(answers).filter(([questionId, answer]) => {
      const question = currentExamQuestions.find(q => q.id.toString() === questionId);
      return question && question.correctAnswer === answer;
    }).length;

    const score = Math.round((correct / currentExamQuestions.length) * 100);

    setExamResults({
      examId: currentExamId,
      examName: currentExamName,
      totalQuestions: currentExamQuestions.length,
      correctAnswers: correct,
      score,
      duration,
      timestamp: new Date(),
      answers: answers
    });

    // Guardar en servidor
    saveExamAttempt(answers, correct, score, duration);

    setView('exam-results');
  };

  const saveExamAttempt = async (answers: Record<string | number, string>, correctAnswers: number, score: number, duration: number) => {
    try {
      const response = await fetch(`http://localhost:3002/exams/${currentExamId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: selectedGroup?.id,
          examName: currentExamName,
          totalQuestions: currentExamQuestions.length,
          correctAnswers,
          score,
          answers,
          duration
        })
      });

      if (response.ok) {
        console.log('✅ Intento de examen guardado');
      } else {
        toast.error('No se pudo guardar el intento del examen');
      }
    } catch (error) {
      console.error('Error guardando intento:', error);
      toast.error('Error de conexión al guardar el examen');
    }
  };

  const handleExamBack = () => {
    setView('exams');
    setCurrentExamId(null);
    setCurrentExamName('');
    setCurrentExamQuestions([]);
    setExamAnswers({});
    setExamResults(null);
  };

  const handleStartPlannedSession = async (databaseId: string, flashcards: Flashcard[], studyMode: string, examId?: string | null) => {
    console.log('🚀 Iniciando sesión planificada:', {
      databaseId,
      flashcardsCount: flashcards.length,
      studyMode,
      examId,
    });

    // Modo examen: lanzar el examen vinculado directamente, o navegar a la lista de exámenes
    if (studyMode === 'exam') {
      if (examId) {
        try {
          const res = await fetch(`/api/exams/${examId}`);
          if (res.ok) {
            const exam = await res.json();
            handleStartExam(exam.id, exam.examName, exam.examData || [], exam.timeLimit ?? 0);
            return;
          }
        } catch {
          // si falla, caemos al fallback
        }
      }
      setPreviousView(view);
      setView('exams');
      return;
    }

    // Verificar si hay flashcards disponibles
    if (flashcards.length === 0) {
      alert('No hay flashcards disponibles para esta sesión.');
      return;
    }

    // Configurar la base de datos seleccionada
    setSelectedDatabaseId(databaseId);
    
    // Configurar las flashcards para el repaso
    setReviewCards(flashcards);
    setCurrentCardIndex(0);
    setCardsToRepeat([]);
    setStudyStartTime(new Date());
    
    // Marcar que es una sesión planificada
    setIsPlannedSession(true);
    
    // Configurar el modo de estudio
    setPendingMode(studyMode as 'review' | 'matching');
    setPreviousView(view); // Regresar a la vista desde donde se inició la sesión
    
    // Navegar directamente al modo de estudio seleccionado
    if (studyMode === 'overview') {
      setView('overview');
    } else if (studyMode === 'matching') {
      setView('matching');
    } else {
      setView('review'); // Por defecto, modo review
    }
  };

  // Show setup if no token is configured
  if (!import.meta.env.VITE_NOTION_TOKEN) {
    if (view === 'notion-setup') {
      return <NotionSetup onComplete={() => setView('home')} />;
    }
    
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="NotionStudy" 
          subtitle="Mindful Learning"
        />
        <main className="container max-w-4xl py-8 px-6">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Para usar esta aplicación necesitas configurar tu integración con Notion.
              <button 
                onClick={() => setView('notion-setup')}
                className="ml-2 underline hover:no-underline"
              >
                Configurar ahora
              </button>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  // Show connection status
  if (connectionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Conectando con Notion...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          title="NotionStudy" 
          subtitle="Mindful Learning"
        />
        <main className="container max-w-4xl py-8 px-6">
          <Alert className="mb-6">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              No se pudo conectar con Notion. Verifica tu token de integración en el archivo .env
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Necesitas configurar VITE_NOTION_TOKEN con tu token de integración de Notion.
              </span>
            </AlertDescription>
          </Alert>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="NotionStudy" 
        subtitle="Mindful Learning"
        currentView={view}
        onNavigate={handleNavigate}
      />

      <main className="container max-w-6xl py-8 px-6">
        {view === 'home' && (
          <HomeView />
        )}

        {view === 'groups' && (
          <GroupsView
            groups={groups}
            groupsLoading={groupsLoading}
            onGroupClick={handleGroupClick}
            onEditGroup={setEditingGroup}
            onDeleteGroup={setDeletingGroup}
            onShowGeneralInfo={() => setView('groups-general-info')}
          />
        )}

        {view === 'groups-general-info' && (
          <GroupGeneralInfoView
            groups={groups}
            onBack={() => setView('groups')}
            onStartSession={handleStartPlannedSession}
          />
        )}

        {view === 'stats' && (
          <StatsView onBack={handleBackToHome} />
        )}

        {view === 'smart-review' && (
          <SmartReviewView groups={groups} onBack={handleBackToHome} />
        )}

        {view === 'group-detail' && selectedGroup && (
          <GroupDetailView
            group={selectedGroup}
            databases={databases}
            databasesLoading={databasesLoading}
            onBack={() => setView('groups')}
            onDatabaseClick={handleDatabaseClick}
            onEditGroup={setEditingGroup}
            onShowGroupStats={handleShowGroupStats}
            onShowGroupGoals={handleShowGroupGoals}
            onShowGroupPlanning={handleShowGroupPlanning}
            onShowGroupExams={handleShowGroupExams}
            databaseCounts={databaseCounts}
          />
        )}

        {view === 'group-stats' && selectedGroup && (
          <GroupStatsDetailView
            group={selectedGroup}
            databases={databases}
            onBack={() => setView('group-detail')}
          />
        )}

        {view === 'group-goals' && selectedGroup && (
          <GroupGoalsView
            group={selectedGroup}
            onBack={() => setView('group-detail')}
          />
        )}

        {view === 'planning' && selectedGroup && (
          <PlanningView
            group={selectedGroup}
            databases={databases}
            onBack={() => setView('group-detail')}
            onStartSession={handleStartPlannedSession}
          />
        )}

        {view === 'exams' && selectedGroup && (
          <ExamsView
            group={selectedGroup}
            onBack={() => setView('group-detail')}
            onStartExam={handleStartExam}
          />
        )}
      </main>

      {/* Mode Selection Modal */}
      {view === 'mode-selection' && selectedDatabase && (
        <ModeSelection
          stats={flashcardsStats}
          databaseName={selectedDatabase.name}
          isLoadingFlashcards={flashcardsLoading}
          onStartActiveReview={handleStartActiveReview}
          onStartOverviewMode={handleStartOverviewMode}
          onStartMatchingMode={handleStartMatchingMode}
          onCancel={handleCloseModeSelection}
        />
      )}

      {/* Overview Mode */}
      {view === 'overview' && selectedDatabase && (
        <OverviewMode
          flashcards={isPlannedSession ? reviewCards : flashcards}
          databaseName={selectedDatabase.name}
          databaseId={selectedDatabase.id}
          onClose={handleCloseOverview}
          onReviewSingleCard={handleReviewSingleCard}
        />
      )}

      {/* Matching Mode */}
      {view === 'matching' && selectedDatabase && (
        <MatchingMode
          cards={reviewCards}
          onClose={handleCloseOverview}
        />
      )}

      {/* Review Setup Modal */}
      {view === 'review-setup' && selectedDatabase && (
        <ReviewSetup
          stats={reviewSetupStats}
          databaseName={selectedDatabase.name}
          databaseId={selectedDatabase.id}
          flashcards={flashcards}
          mode={pendingMode}
          onStart={handleStartReview}
          onCancel={() => {
            setView('mode-selection');
          }}
        />
      )}

      {/* Review Mode */}
      {view === 'review' && reviewCards.length > 0 && (
        <FlashcardReview
          key={reviewCards[currentCardIndex]?.id} // Forzar re-mount cuando cambie la flashcard
          card={reviewCards[currentCardIndex]}
          onStateChange={handleStateChange}
          onNext={handleNextCard}
          onRepeat={handleRepeatCard}
          onPrevious={handlePreviousCard}
          onClose={handleCloseReview}
          currentIndex={currentCardIndex}
          totalCards={reviewCards.length}
          cardsToRepeatCount={cardsToRepeat.length}
        />
      )}

      {/* Session Summary */}
      {view === 'session-summary' && sessionSummaryData && (
        <SessionSummaryView
          data={sessionSummaryData}
          onGoHome={handleSessionSummaryGoHome}
          onGoSmartReview={handleSessionSummaryGoSmartReview}
        />
      )}

      {/* Exam Mode */}
      {view === 'exam-player' && (
        <ExamMode
          examName={currentExamName}
          questions={currentExamQuestions}
          timeLimit={currentExamTimeLimit}
          onSubmit={handleExamSubmit}
          onBack={handleExamBack}
        />
      )}

      {/* Exam Results */}
      {view === 'exam-results' && examResults && (
        <ExamResults
          attempt={examResults}
          questions={currentExamQuestions}
          onBack={handleExamBack}
        />
      )}

      {/* Diálogos para editar y eliminar agrupaciones */}
      <EditGroupDialog
        group={editingGroup}
        open={!!editingGroup}
        onOpenChange={(open) => !open && setEditingGroup(null)}
      />
      
      <DeleteGroupDialog
        group={deletingGroup}
        open={!!deletingGroup}
        onOpenChange={(open) => !open && setDeletingGroup(null)}
      />
    </div>
  );
};

export default Index;