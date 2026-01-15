import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "" 
}) => {
  // Función para procesar el markdown básico
  const processMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Patrones de markdown
    const patterns = [
      // Imágenes: ![alt](url)
      {
        regex: /!\[([^\]]*)\]\(([^)]+)\)/g,
        render: (match: RegExpMatchArray) => (
          <div key={key++} className="my-3">
            <img
              src={match[2]}
              alt={match[1] || 'Imagen'}
              className="max-w-full h-auto rounded-lg shadow-sm border border-border"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div class="p-3 bg-muted rounded-lg text-center text-muted-foreground border border-dashed">
                      📷 Error cargando imagen<br>
                      <small class="text-xs opacity-70">${match[2].substring(0, 50)}...</small>
                    </div>
                  `;
                }
              }}
            />
            {match[1] && (
              <p className="text-sm text-muted-foreground text-center mt-2 italic">
                {match[1]}
              </p>
            )}
          </div>
        )
      },
      // Enlaces: [texto](url)
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        render: (match: RegExpMatchArray) => (
          <a
            key={key++}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            {match[1]}
          </a>
        )
      },
      // Negrita: **texto**
      {
        regex: /\*\*([^*]+)\*\*/g,
        render: (match: RegExpMatchArray) => (
          <strong key={key++} className="font-semibold text-foreground">
            {match[1]}
          </strong>
        )
      },
      // Cursiva: *texto*
      {
        regex: /\*([^*]+)\*/g,
        render: (match: RegExpMatchArray) => (
          <em key={key++} className="italic">
            {match[1]}
          </em>
        )
      }
    ];

    // Procesar cada patrón
    let processedText = text;
    const replacements: Array<{
      start: number;
      end: number;
      element: React.ReactNode;
    }> = [];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          element: pattern.render(match)
        });
      }
    });

    // Ordenar reemplazos por posición
    replacements.sort((a, b) => a.start - b.start);

    // Construir el resultado final
    let lastIndex = 0;
    replacements.forEach(replacement => {
      // Agregar texto antes del reemplazo
      if (replacement.start > lastIndex) {
        const textBefore = text.substring(lastIndex, replacement.start);
        if (textBefore) {
          parts.push(textBefore);
        }
      }
      
      // Agregar el elemento de reemplazo
      parts.push(replacement.element);
      lastIndex = replacement.end;
    });

    // Agregar texto restante
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }

    return parts.length > 0 ? parts : [text];
  };

  // Dividir por saltos de línea y procesar cada línea
  const lines = content.split('\n');
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {lines.map((line, index) => {
        const processedLine = processMarkdown(line);
        
        return (
          <div key={index} className={index > 0 ? 'mt-2' : ''}>
            {processedLine.length === 1 && typeof processedLine[0] === 'string' && processedLine[0] === '' ? (
              <br />
            ) : (
              processedLine
            )}
          </div>
        );
      })}
    </div>
  );
};