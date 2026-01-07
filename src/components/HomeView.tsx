import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

export const HomeView: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      const response = await fetch('http://localhost:3002/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Mostrar mensaje de éxito
        const successMsg = document.createElement('div');
        successMsg.innerHTML = '✅ Cache limpiado correctamente';
        successMsg.style.cssText = `
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: #10B981; 
          color: white;
          padding: 12px 16px; 
          border-radius: 8px; 
          font-size: 14px; 
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        throw new Error('Error al limpiar cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Mostrar mensaje de error
      const errorMsg = document.createElement('div');
      errorMsg.innerHTML = '❌ Error al limpiar cache';
      errorMsg.style.cssText = `
        position: fixed; 
        top: 20px; 
        right: 20px; 
        background: #EF4444; 
        color: white;
        padding: 12px 16px; 
        border-radius: 8px; 
        font-size: 14px; 
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      `;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 3000);
    } finally {
      setIsClearing(false);
    }
  };
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <section className="text-center py-16">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Bienvenido a NotionStudy
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
          Organiza tu aprendizaje con flashcards inteligentes conectadas a Notion. 
          Crea agrupaciones, revisa contenido y sigue tu progreso de manera eficiente.
        </p>
        
        {/* Botón para limpiar cache */}
        <div className="mb-8">
          <Button
            onClick={handleClearCache}
            disabled={isClearing}
            variant="outline"
            className="mx-auto"
          >
            {isClearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Limpiando cache...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Limpiar Cache
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Usa este botón si agregaste nuevas flashcards en Notion y no aparecen en la app
          </p>
        </div>
        
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Organización inteligente</h3>
            <p className="text-muted-foreground">
              Agrupa tus bases de datos de Notion por temas y proyectos para un estudio más estructurado.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Seguimiento de progreso</h3>
            <p className="text-muted-foreground">
              Monitorea tu avance con estadísticas detalladas y sistemas de estados de conocimiento.
            </p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Repaso eficiente</h3>
            <p className="text-muted-foreground">
              Sistema de flashcards inteligente que se adapta a tu ritmo de aprendizaje.
            </p>
          </div>
        </div>
      </section>

      {/* Getting Started */}
      <section className="bg-card border border-border rounded-lg p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground mb-4">¿Cómo empezar?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <span className="text-muted-foreground">Crea agrupaciones para organizar tus materias</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <span className="text-muted-foreground">Conecta tus bases de datos de Notion</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <span className="text-muted-foreground">Comienza a repasar y estudiar</span>
          </div>
        </div>
      </section>
    </div>
  );
};