import React, { useState, useMemo } from 'react';
import { Flashcard, KnowledgeState, Database, FlashcardWithDatabase } from '@/types';
import { useNotionFlashcards } from '@/hooks/useNotion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search,
  Filter,
  CheckSquare,
  Square,
  StickyNote,
  X,
  Loader2
} from 'lucide-react';

interface FlashcardSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashcards?: Flashcard[]; // Opcional para compatibilidad
  selectedFlashcards: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onConfirm: () => void;
  isLoading?: boolean;
  databases?: Database[]; // Nuevas bases de datos para cargar flashcards
}

type FilterState = 'all' | 'tocado' | 'verde' | 'solido' | 'with-notes';

const stateLabels = {
  tocado: 'Tocado',
  verde: 'Verde', 
  solido: 'Sólido'
};

const stateColors = {
  tocado: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  verde: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  solido: 'text-green-600 bg-green-100 dark:bg-green-900/30'
};

export const FlashcardSelectionDialog: React.FC<FlashcardSelectionDialogProps> = ({
  open,
  onOpenChange,
  flashcards = [],
  selectedFlashcards,
  onSelectionChange,
  onConfirm,
  isLoading = false,
  databases = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterState, setFilterState] = useState<FilterState>('all');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('all');

  // Cargar flashcards de múltiples bases de datos
  const databaseFlashcards = useMemo(() => {
    if (databases.length === 0) return flashcards || [];
    
    // Si tenemos bases de datos, intentar agregar información de DB a las flashcards
    return (flashcards || []).map(card => {
      if ('databaseId' in card && card.databaseId) {
        const database = databases.find(db => db.id === card.databaseId);
        return {
          ...card,
          databaseName: database?.name || 'Base de datos desconocida',
          databaseIcon: database?.icon || '📄'
        } as FlashcardWithDatabase;
      }
      return card;
    });
  }, [databases, flashcards]);

  // Usar flashcards combinadas o las pasadas directamente
  const allFlashcards = databases.length > 0 ? databaseFlashcards : flashcards;

  // Filtrar flashcards según búsqueda y filtros
  const filteredFlashcards = useMemo(() => {
    let filtered = allFlashcards;

    // Filtro por base de datos
    if (selectedDatabase !== 'all' && databases.length > 0) {
      filtered = filtered.filter(card => {
        // Verificar si la flashcard tiene databaseId y coincide
        if ('databaseId' in card && card.databaseId) {
          return card.databaseId === selectedDatabase;
        }
        return false;
      });
    }

    // Filtro por texto de búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(card => 
        card.title.toLowerCase().includes(search) ||
        card.content.toLowerCase().includes(search)
      );
    }

    // Filtro por estado
    if (filterState !== 'all') {
      if (filterState === 'with-notes') {
        filtered = filtered.filter(card => 
          card.reviewNotes && card.reviewNotes.length > 0
        );
      } else {
        filtered = filtered.filter(card => card.state === filterState);
      }
    }

    return filtered;
  }, [allFlashcards, searchTerm, filterState, selectedDatabase, databases.length]);

  const handleSelectAll = () => {
    const allFilteredIds = filteredFlashcards.map(card => card.id);
    const newSelection = [...new Set([...selectedFlashcards, ...allFilteredIds])];
    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const filteredIds = new Set(filteredFlashcards.map(card => card.id));
    const newSelection = selectedFlashcards.filter(id => !filteredIds.has(id));
    onSelectionChange(newSelection);
  };

  const handleCardToggle = (cardId: string) => {
    const newSelection = selectedFlashcards.includes(cardId)
      ? selectedFlashcards.filter(id => id !== cardId)
      : [...selectedFlashcards, cardId];
    onSelectionChange(newSelection);
  };

  const selectedCount = selectedFlashcards.length;
  const filteredSelectedCount = filteredFlashcards.filter(card => 
    selectedFlashcards.includes(card.id)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Seleccionar flashcards para la sesión</DialogTitle>
          <DialogDescription>
            Elige las flashcards que quieres incluir en esta sesión de estudio
          </DialogDescription>
        </DialogHeader>

        {/* Controles de búsqueda y filtros */}
        <div className="space-y-4 border-b pb-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título o contenido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtros y acciones */}
          <div className="space-y-3">
            {/* Primera fila: Filtros */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="filter">Filtrar por:</Label>
                <Select value={filterState} onValueChange={(value: FilterState) => setFilterState(value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="tocado">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        Tocado
                      </div>
                    </SelectItem>
                    <SelectItem value="verde">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        Verde
                      </div>
                    </SelectItem>
                    <SelectItem value="solido">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Sólido
                      </div>
                    </SelectItem>
                    <SelectItem value="with-notes">
                      <div className="flex items-center gap-2">
                        <StickyNote className="w-3 h-3" />
                        Con notas
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por base de datos (solo si hay múltiples) */}
              {databases.length > 1 && (
                <div className="flex items-center gap-2">
                  <Label>Base de datos:</Label>
                  <Select value={selectedDatabase} onValueChange={setSelectedDatabase}>
                    <SelectTrigger className="w-64 min-w-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las bases de datos</SelectItem>
                      {databases.map((database) => (
                        <SelectItem key={database.id} value={database.id}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="flex-shrink-0">{database.icon}</span>
                            <span className="truncate">{database.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Segunda fila: Botones de acción */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={filteredFlashcards.length === 0}
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Seleccionar todas ({filteredFlashcards.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeselectAll}
                disabled={filteredSelectedCount === 0}
              >
                <Square className="w-4 h-4 mr-2" />
                Deseleccionar filtradas
              </Button>
            </div>
          </div>

          {/* Contador */}
          <div className="text-sm text-muted-foreground">
            {selectedCount} flashcard{selectedCount !== 1 ? 's' : ''} seleccionada{selectedCount !== 1 ? 's' : ''} de {allFlashcards.length} total{allFlashcards.length !== 1 ? 'es' : ''}
            {filteredFlashcards.length !== allFlashcards.length && (
              <span> • Mostrando {filteredFlashcards.length} filtrada{filteredFlashcards.length !== 1 ? 's' : ''}</span>
            )}
            {databases.length > 1 && (
              <span> • {databases.length} bases de datos</span>
            )}
          </div>
        </div>

        {/* Lista de flashcards */}
        <div className="flex-1 overflow-y-auto">
          {filteredFlashcards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm || filterState !== 'all' ? (
                <>
                  <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No se encontraron flashcards con los filtros aplicados</p>
                </>
              ) : (
                <>
                  <Square className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay flashcards disponibles</p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFlashcards.map((card) => {
                const isSelected = selectedFlashcards.includes(card.id);
                const hasNotes = card.reviewNotes && card.reviewNotes.length > 0;
                
                return (
                  <div
                    key={card.id}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer
                      ${isSelected 
                        ? 'bg-primary/5 border-primary/20 shadow-sm' 
                        : 'bg-card border-border hover:bg-muted/50'
                      }
                    `}
                    onClick={() => handleCardToggle(card.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onChange={() => handleCardToggle(card.id)}
                      className="mt-1"
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-medium text-foreground truncate">
                          {card.title}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {hasNotes && (
                            <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                              <StickyNote className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </div>
                          )}
                          <span className={`
                            px-2 py-1 text-xs font-medium rounded-full
                            ${stateColors[card.state]}
                          `}>
                            {stateLabels[card.state]}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {card.content.length > 100 
                          ? `${card.content.substring(0, 100)}...` 
                          : card.content
                        }
                      </p>
                      
                      {/* Mostrar base de datos si hay múltiples */}
                      {databases.length > 1 && 'databaseName' in card && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <span>{(card as FlashcardWithDatabase).databaseIcon}</span>
                          <span>{(card as FlashcardWithDatabase).databaseName}</span>
                        </div>
                      )}
                      
                      {hasNotes && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {card.reviewNotes.length} nota{card.reviewNotes.length !== 1 ? 's' : ''} de repaso
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          
          <Button
            onClick={onConfirm}
            disabled={selectedCount === 0 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando sesión...
              </>
            ) : (
              <>
                Confirmar selección ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};