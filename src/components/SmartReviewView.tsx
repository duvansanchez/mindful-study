import React, { useState, useMemo } from 'react';
import { ArrowLeft, Brain, AlertTriangle, TrendingDown, Moon, ChevronDown, ChevronRight, Loader2, Clock, CalendarDays, ArrowUpDown } from 'lucide-react';
import { DatabaseGroup, Flashcard } from '@/types';
import { useSpacedRepetition } from '@/hooks/useSpacedRepetition';
import { useStudyStreak, useStudyCalendar } from '@/hooks/useStudyTracking';
import { StateBadge } from './StateBadge';

interface SmartReviewViewProps {
  groups: DatabaseGroup[];
  onBack: () => void;
}

type Tab = 'spaced' | 'health' | 'activity';

type EnrichedFlashcard = Flashcard & { groupName?: string };

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

const FlashcardRow: React.FC<{ card: EnrichedFlashcard }> = ({ card }) => (
  <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors gap-3">
    <span className="text-sm text-foreground truncate flex-1">{card.title}</span>
    {card.groupName && (
      <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 max-w-[120px] truncate">
        {card.groupName}
      </span>
    )}
    <StateBadge state={card.state} size="xs" />
  </div>
);

type SortOption = 'default' | 'title-asc' | 'title-desc' | 'state' | 'group';

const STATE_ORDER: Record<string, number> = { tocado: 0, verde: 1, solido: 2 };

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Por defecto',
  'title-asc': 'Título A→Z',
  'title-desc': 'Título Z→A',
  state: 'Estado',
  group: 'Agrupación',
};

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  cards: EnrichedFlashcard[];
  defaultOpen?: boolean;
  badgeClass?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  cards,
  defaultOpen = false,
  badgeClass = 'bg-secondary text-muted-foreground',
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [groupFilter, setGroupFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  const availableGroups = useMemo(() => {
    const names = cards.map(c => c.groupName).filter((n): n is string => Boolean(n));
    return [...new Set(names)].sort();
  }, [cards]);

  const processedCards = useMemo(() => {
    let result = groupFilter ? cards.filter(c => c.groupName === groupFilter) : cards;

    if (sortBy === 'title-asc') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'title-desc') {
      result = [...result].sort((a, b) => b.title.localeCompare(a.title));
    } else if (sortBy === 'state') {
      result = [...result].sort((a, b) => (STATE_ORDER[a.state] ?? 0) - (STATE_ORDER[b.state] ?? 0));
    } else if (sortBy === 'group') {
      result = [...result].sort((a, b) => (a.groupName ?? '').localeCompare(b.groupName ?? ''));
    }

    return result;
  }, [cards, groupFilter, sortBy]);

  const hasFilters = groupFilter || sortBy !== 'default';

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
            {cards.length}
          </span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <>
          {/* Filter + sort bar */}
          <div className="border-t border-border px-3 py-2 flex flex-wrap items-center gap-2 bg-secondary/20">
            {/* Group filter */}
            {availableGroups.length > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Agrupación:</span>
                <div className="relative">
                  <select
                    value={groupFilter}
                    onChange={e => setGroupFilter(e.target.value)}
                    className="text-xs bg-background border border-border rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    <option value="">Todas ({cards.length})</option>
                    {availableGroups.map(g => (
                      <option key={g} value={g}>
                        {g} ({cards.filter(c => c.groupName === g).length})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  className="text-xs bg-background border border-border rounded-md px-2 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {(Object.keys(SORT_LABELS) as SortOption[]).map(opt => (
                    <option key={opt} value={opt}>{SORT_LABELS[opt]}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={() => { setGroupFilter(''); setSortBy('default'); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          <div className="border-t border-border px-2 py-2 space-y-0.5 max-h-72 overflow-y-auto">
            {processedCards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Sin tarjetas en esta categoría</p>
            ) : (
              processedCards.map(card => <FlashcardRow key={card.id} card={card} />)
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Activity Heatmap
// ────────────────────────────────────────────────────────────────────────────

const ActivityHeatmap: React.FC<{ data: { date: string; count: number }[]; days?: number }> = ({
  data,
  days = 90,
}) => {
  const cells = useMemo(() => {
    const countMap = new Map(data.map(d => [d.date, d.count]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result: { date: Date; count: number; label: string }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: d, count: countMap.get(key) ?? 0, label: key });
    }
    return result;
  }, [data, days]);

  const maxCount = useMemo(() => Math.max(1, ...cells.map(c => c.count)), [cells]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-secondary';
    const intensity = Math.ceil((count / maxCount) * 4);
    if (intensity >= 4) return 'bg-emerald-500';
    if (intensity === 3) return 'bg-emerald-400';
    if (intensity === 2) return 'bg-emerald-300';
    return 'bg-emerald-200';
  };

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-1"
        style={{ gridTemplateRows: 'repeat(7, 1fr)', gridAutoFlow: 'column' }}
      >
        {cells.map(cell => (
          <div
            key={cell.label}
            title={`${cell.label}: ${cell.count} sesiones`}
            className={`w-3 h-3 rounded-sm ${getColor(cell.count)} transition-colors`}
          />
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

export const SmartReviewView: React.FC<SmartReviewViewProps> = ({ groups, onBack }) => {
  const [activeTab, setActiveTab] = useState<Tab>('spaced');
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);

  const { dueToday, dueThisWeek, neverReviewed, atRisk, problematic, isLoading, totalFlashcards } =
    useSpacedRepetition(groups, selectedGroupId);

  const { data: streakData } = useStudyStreak();
  const { data: calendarData = [] } = useStudyCalendar(90);

  const streak = streakData?.streak ?? 0;

  // Map databaseId → group name for enriching flashcards
  const databaseToGroup = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach(g => {
      (g.databaseIds ?? []).forEach(dbId => map.set(dbId, g.name));
    });
    return map;
  }, [groups]);

  const enrich = (cards: Flashcard[]): EnrichedFlashcard[] =>
    cards.map(c => ({ ...c, groupName: databaseToGroup.get(c.databaseId) }));

  const tabs: { id: Tab; label: string }[] = [
    { id: 'spaced', label: 'Repetición espaciada' },
    { id: 'health', label: 'Salud' },
    { id: 'activity', label: 'Actividad' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver</span>
        </button>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-semibold">Repaso Inteligente</h1>
        </div>
        <div className="w-16" />
      </div>

      {/* Group selector */}
      <div className="flex items-center gap-2">
        <label className="text-sm text-muted-foreground whitespace-nowrap">Agrupación:</label>
        <div className="relative">
          <select
            value={selectedGroupId ?? ''}
            onChange={e => setSelectedGroupId(e.target.value || undefined)}
            className="text-sm bg-secondary border border-border rounded-lg px-3 py-1.5 pr-8 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todas las agrupaciones</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && activeTab !== 'activity' && (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Calculando...</span>
        </div>
      )}

      {/* ── TAB 1: Repetición espaciada ── */}
      {!isLoading && activeTab === 'spaced' && (
        <div className="space-y-4">
          {/* Banner resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{dueToday.length}</p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">Vencen hoy</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{dueThisWeek.length}</p>
              <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5">Esta semana</p>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{neverReviewed.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sin repasar</p>
            </div>
          </div>

          {/* Sección: Vencen hoy */}
          <CollapsibleSection
            title="Vencen hoy"
            icon={<Clock className="w-4 h-4 text-red-500" />}
            cards={enrich(dueToday)}
            defaultOpen={false}
            badgeClass="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
          />

          {/* Sección: Esta semana */}
          <CollapsibleSection
            title="Próxima semana"
            icon={<CalendarDays className="w-4 h-4 text-amber-500" />}
            cards={enrich(dueThisWeek)}
            defaultOpen={false}
            badgeClass="bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
          />

          {/* Sección: Nunca repasadas */}
          <CollapsibleSection
            title="Nunca repasadas"
            icon={<Moon className="w-4 h-4 text-muted-foreground" />}
            cards={enrich(neverReviewed)}
            defaultOpen={false}
          />

          {totalFlashcards > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Total analizado: {totalFlashcards} flashcards
            </p>
          )}

          <div className="border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">Cómo se calcula</p>
            <p><span className="font-medium text-red-500">Vencen hoy</span>: tarjetas que ya superaron su intervalo de repaso — tocadas sin repasar en más de 1 día, verdes en más de 7 días, sólidas en más de 21 días.</p>
            <p><span className="font-medium text-amber-500">Próxima semana</span>: tarjetas que vencerán en los próximos 7 días, útil para anticipar la carga de estudio.</p>
            <p><span className="font-medium text-muted-foreground">Nunca repasadas</span>: tarjetas que aún no tienen ninguna sesión de estudio registrada.</p>
          </div>
        </div>
      )}

      {/* ── TAB 2: Salud del conocimiento ── */}
      {!isLoading && activeTab === 'health' && (
        <div className="space-y-4">
          {/* Cards resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{atRisk.length}</p>
              <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">En riesgo</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{problematic.length}</p>
              <p className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">Problemáticas</p>
            </div>
          </div>

          {/* En riesgo */}
          <CollapsibleSection
            title="En riesgo"
            icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
            cards={enrich(atRisk)}
            defaultOpen={false}
            badgeClass="bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400"
          />

          {/* Problemáticas */}
          <CollapsibleSection
            title="Problemáticas"
            icon={<TrendingDown className="w-4 h-4 text-purple-500" />}
            cards={enrich(problematic)}
            defaultOpen={false}
            badgeClass="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
          />

          {atRisk.length === 0 && problematic.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <p className="text-4xl">🎉</p>
              <p className="font-medium">¡Excelente estado!</p>
              <p className="text-sm text-muted-foreground">No hay tarjetas en riesgo ni problemáticas.</p>
            </div>
          )}

          <div className="border border-border rounded-xl p-4 space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground text-sm">Cómo se calcula</p>
            <p><span className="font-medium text-orange-500">En riesgo</span>: tarjetas verdes o sólidas que llevan demasiado tiempo sin repasarse — más de 14 días para verdes y más de 42 días para sólidas. Estas tarjetas corren el riesgo de olvidarse.</p>
            <p><span className="font-medium text-purple-500">Problemáticas</span>: tarjetas que has repasado más de 3 veces pero siguen en estado "tocado". Puede que necesiten un enfoque de estudio diferente.</p>
          </div>
        </div>
      )}

      {/* ── TAB 3: Actividad ── */}
      {activeTab === 'activity' && (
        <div className="space-y-5">
          {/* Streak card */}
          <div className="flex items-center gap-4 bg-secondary/50 border border-border rounded-xl p-4">
            <div className="text-4xl">🔥</div>
            <div>
              <p className="text-2xl font-bold">
                {streak} {streak === 1 ? 'día' : 'días'}
              </p>
              <p className="text-sm text-muted-foreground">
                {streak === 0
                  ? 'Empieza a estudiar hoy para comenzar tu racha'
                  : streak === 1
                  ? '¡Buen comienzo! Vuelve mañana para seguir la racha'
                  : `¡Llevas ${streak} días seguidos estudiando!`}
              </p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Actividad — últimos 90 días</p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Menos</span>
                <div className="flex gap-0.5">
                  <div className="w-3 h-3 rounded-sm bg-secondary" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-200" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-300" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                  <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                </div>
                <span>Más</span>
              </div>
            </div>
            <ActivityHeatmap data={calendarData} days={90} />
            <p className="text-xs text-muted-foreground">
              Cada cuadro representa un día. El color indica la intensidad de estudio de ese día.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
