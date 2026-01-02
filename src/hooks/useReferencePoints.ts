import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ReferencePoint {
  id: number;
  flashcardId: string;
  databaseId: string;
  selectedText: string;
  referenceName: string;
  textPosition?: number;
  blockId?: string;
  contextBefore?: string;
  contextAfter?: string;
  category: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReferencePointData {
  selectedText: string;
  referenceName: string;
  databaseId: string;
  textPosition?: number;
  blockId?: string;
  contextBefore?: string;
  contextAfter?: string;
  category?: string;
  color?: string;
}

// Hook para obtener puntos de referencia de una flashcard
export const useReferencePoints = (flashcardId: string | null) => {
  return useQuery({
    queryKey: ['reference-points', flashcardId],
    queryFn: async () => {
      if (!flashcardId) return [];
      
      const response = await fetch(`/api/flashcards/${flashcardId}/reference-points`);
      if (!response.ok) {
        throw new Error('Error fetching reference points');
      }
      return response.json();
    },
    enabled: !!flashcardId,
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
};

// Hook para crear punto de referencia
export const useCreateReferencePoint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ flashcardId, data }: { flashcardId: string; data: CreateReferencePointData }) => {
      const response = await fetch(`/api/flashcards/${flashcardId}/reference-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Error creating reference point');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidar cache de puntos de referencia para esta flashcard
      queryClient.invalidateQueries({ 
        queryKey: ['reference-points', variables.flashcardId] 
      });
    },
  });
};

// Hook para actualizar punto de referencia
export const useUpdateReferencePoint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ referenceId, updates }: { referenceId: number; updates: Partial<ReferencePoint> }) => {
      const response = await fetch(`/api/reference-points/${referenceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error('Error updating reference point');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar todas las queries de puntos de referencia
      queryClient.invalidateQueries({ queryKey: ['reference-points'] });
    },
  });
};

// Hook para eliminar punto de referencia
export const useDeleteReferencePoint = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (referenceId: number) => {
      const response = await fetch(`/api/reference-points/${referenceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error deleting reference point');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar todas las queries de puntos de referencia
      queryClient.invalidateQueries({ queryKey: ['reference-points'] });
    },
  });
};

// Hook para obtener conteos de puntos de referencia por base de datos
export const useReferencePointsCountByDatabase = (databaseId: string | null) => {
  return useQuery({
    queryKey: ['reference-points-count', databaseId],
    queryFn: async () => {
      if (!databaseId) return {};
      
      const response = await fetch(`/api/databases/${databaseId}/reference-points-count`);
      if (!response.ok) {
        throw new Error('Error fetching reference points count');
      }
      return response.json();
    },
    enabled: !!databaseId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

// Hook para manejar selección de texto
export const useTextSelection = () => {
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0 && selection.toString().trim().length > 0) {
      const text = selection.toString();
      const range = selection.getRangeAt(0);
      
      setSelectedText(text);
      setSelectionRange(range);
      
      return {
        text,
        range,
        // Obtener contexto antes y después
        contextBefore: getContextBefore(range, 50),
        contextAfter: getContextAfter(range, 50),
      };
    }
    
    return null;
  };

  const clearSelection = () => {
    setSelectedText('');
    setSelectionRange(null);
    window.getSelection()?.removeAllRanges();
  };

  return {
    selectedText,
    selectionRange,
    handleTextSelection,
    clearSelection,
  };
};

// Funciones auxiliares para obtener contexto
const getContextBefore = (range: Range, maxLength: number): string => {
  try {
    const container = range.startContainer;
    const offset = range.startOffset;
    
    if (container.nodeType === Node.TEXT_NODE) {
      const textContent = container.textContent || '';
      const start = Math.max(0, offset - maxLength);
      return textContent.substring(start, offset);
    }
    
    return '';
  } catch (error) {
    console.error('Error getting context before:', error);
    return '';
  }
};

const getContextAfter = (range: Range, maxLength: number): string => {
  try {
    const container = range.endContainer;
    const offset = range.endOffset;
    
    if (container.nodeType === Node.TEXT_NODE) {
      const textContent = container.textContent || '';
      const end = Math.min(textContent.length, offset + maxLength);
      return textContent.substring(offset, end);
    }
    
    return '';
  } catch (error) {
    console.error('Error getting context after:', error);
    return '';
  }
};