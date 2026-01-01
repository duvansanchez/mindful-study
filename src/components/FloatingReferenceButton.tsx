import React, { useState, useEffect } from 'react';
import { Bookmark, Plus } from 'lucide-react';

interface FloatingReferenceButtonProps {
  onCreateReference: () => void;
}

export const FloatingReferenceButton: React.FC<FloatingReferenceButtonProps> = ({
  onCreateReference
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      
      if (selection && selection.toString().trim().length > 0) {
        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Posicionar el botón arriba del texto seleccionado
        setPosition({
          x: rect.left + (rect.width / 2), // Centro horizontal
          y: rect.top - 50 // 50px arriba del texto
        });
        setSelectedText(text);
      } else {
        setPosition(null);
        setSelectedText('');
      }
    };

    // Escuchar cambios en la selección
    document.addEventListener('selectionchange', handleSelectionChange);
    
    // También escuchar mouseup para capturar selecciones rápidas
    document.addEventListener('mouseup', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
    };
  }, []);

  // Ocultar el botón si se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Si no se hizo clic en el botón flotante, ocultar
      if (!target.closest('.floating-reference-button')) {
        // Pequeño delay para permitir que el clic en el botón se procese primero
        setTimeout(() => {
          const selection = window.getSelection();
          if (!selection || selection.toString().trim().length === 0) {
            setPosition(null);
            setSelectedText('');
          }
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!position || !selectedText) {
    return null;
  }

  return (
    <div
      className="floating-reference-button fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)', // Centrar horizontalmente
      }}
    >
      <div className="bg-primary text-primary-foreground shadow-lg rounded-lg border border-border/20 overflow-hidden">
        <button
          onClick={() => {
            onCreateReference();
            // Mantener la selección activa para el diálogo
          }}
          className="flex items-center gap-2 px-3 py-2 hover:bg-primary/90 transition-colors text-sm font-medium"
          title={`Crear punto de referencia: "${selectedText.substring(0, 30)}${selectedText.length > 30 ? '...' : ''}"`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Crear referencia</span>
        </button>
      </div>
      
      {/* Flecha apuntando hacia abajo */}
      <div 
        className="absolute top-full left-1/2 transform -translate-x-1/2"
        style={{ marginTop: '-1px' }}
      >
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-primary"></div>
      </div>
    </div>
  );
};