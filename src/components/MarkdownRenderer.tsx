import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onImageClick?: (imageUrl: string, caption?: string) => void;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = "",
  onImageClick
}) => {
  // Función para detectar y procesar tablas markdown
  const processTable = (lines: string[], startIndex: number): { element: React.ReactNode; endIndex: number } | null => {
    if (startIndex >= lines.length) return null;
    
    const headerLine = lines[startIndex];
    const separatorLine = lines[startIndex + 1];
    
    // Verificar si es una tabla válida
    if (!headerLine || !separatorLine) return null;
    if (!headerLine.includes('|') || !separatorLine.includes('|')) return null;
    if (!separatorLine.match(/^\s*\|?[\s\-\|:]+\|?\s*$/)) return null;
    
    // Extraer headers
    const headers = headerLine.split('|').map(h => h.trim()).filter(h => h !== '');
    
    // Encontrar todas las filas de la tabla
    const rows: string[][] = [];
    let currentIndex = startIndex + 2; // Empezar después del separador
    
    while (currentIndex < lines.length) {
      const line = lines[currentIndex];
      if (!line || !line.includes('|')) break;
      
      const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
      if (cells.length > 0) {
        rows.push(cells);
        currentIndex++;
      } else {
        break;
      }
    }
    
    // Si no hay filas, no es una tabla válida
    if (rows.length === 0) return null;
    
    const tableElement = (
      <div className="my-4 overflow-x-auto">
        <table className="min-w-full border border-border rounded-lg overflow-hidden">
          <thead className="bg-muted/50">
            <tr>
              {headers.map((header, i) => (
                <th key={i} className="px-3 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                  {processInlineMarkdown(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-2 text-sm text-foreground border-b border-border/30">
                    {processInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    
    return { element: tableElement, endIndex: currentIndex - 1 };
  };

  // Función para procesar markdown inline (negrita, cursiva, enlaces, etc.)
  const processInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let key = 0;

    // Patrones de markdown en orden de prioridad
    const patterns = [
      // Imágenes: ![alt](url) - debe ir primero para evitar conflictos con enlaces
      {
        regex: /!\[([^\]]*)\]\(([^)]+)\)/g,
        render: (match: RegExpMatchArray, matchIndex: number) => {
          const alt = match[1] || 'Imagen';
          const src = match[2];
          
          // Verificar si es una imagen base64
          const isBase64 = src.startsWith('data:image/');
          
          return (
            <span key={key++} className="inline-block my-2">
              <img
                src={src}
                alt={alt}
                className={`max-w-full h-auto rounded border border-border cursor-pointer hover:opacity-90 transition-opacity ${
                  isBase64 ? 'max-h-40' : 'max-h-20'
                }`}
                loading="lazy"
                onClick={() => onImageClick?.(src, alt)}
                title="Haz clic para ver en tamaño completo"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center gap-2 p-2 bg-muted/50 rounded border border-border text-xs text-muted-foreground">
                        <span>📷</span>
                        <span>Error cargando imagen: ${alt}</span>
                      </div>
                    `;
                  }
                }}
              />
              {alt && alt !== 'Imagen' && (
                <div className="text-xs text-muted-foreground mt-1 text-center">
                  {alt}
                </div>
              )}
            </span>
          );
        }
      },
      // Enlaces: [texto](url)
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        render: (match: RegExpMatchArray, matchIndex: number) => (
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
        render: (match: RegExpMatchArray, matchIndex: number) => (
          <strong key={key++} className="font-semibold text-foreground">
            {match[1]}
          </strong>
        )
      },
      // Cursiva: *texto* (debe ir después de negrita)
      {
        regex: /(?<!\*)\*([^*]+)\*(?!\*)/g,
        render: (match: RegExpMatchArray, matchIndex: number) => (
          <em key={key++} className="italic">
            {match[1]}
          </em>
        )
      }
    ];

    // Procesar cada patrón secuencialmente
    const replacements: Array<{
      start: number;
      end: number;
      element: React.ReactNode;
    }> = [];

    patterns.forEach((pattern) => {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        // Verificar que no se superponga con reemplazos existentes
        const overlaps = replacements.some(r => 
          (match.index >= r.start && match.index < r.end) ||
          (match.index + match[0].length > r.start && match.index + match[0].length <= r.end) ||
          (match.index <= r.start && match.index + match[0].length >= r.end)
        );
        
        if (!overlaps) {
          replacements.push({
            start: match.index,
            end: match.index + match[0].length,
            element: pattern.render(match, match.index)
          });
        }
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

  // Función para procesar encabezados y otros elementos de bloque
  const processBlockElement = (line: string): React.ReactNode | null => {
    // Encabezados: ### Título
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      const processedText = processInlineMarkdown(text);
      
      const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements;
      const sizeClasses = {
        1: 'text-2xl font-bold',
        2: 'text-xl font-bold', 
        3: 'text-lg font-semibold',
        4: 'text-base font-semibold',
        5: 'text-sm font-semibold',
        6: 'text-xs font-semibold'
      };
      
      return (
        <HeaderTag className={`${sizeClasses[level as keyof typeof sizeClasses]} text-foreground mt-2 mb-0.5`}>
          {processedText}
        </HeaderTag>
      );
    }
    
    // Separadores: ---
    if (line.trim() === '---') {
      return <hr className="my-1 border-border" />;
    }
    
    return null;
  };

  // Procesar el contenido completo
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentLineIndex = 0;
  let elementKey = 0;

  while (currentLineIndex < lines.length) {
    const line = lines[currentLineIndex];
    
    // Intentar procesar como tabla
    const tableResult = processTable(lines, currentLineIndex);
    if (tableResult) {
      elements.push(
        <div key={elementKey++}>
          {tableResult.element}
        </div>
      );
      currentLineIndex = tableResult.endIndex + 1;
      continue;
    }
    
    // Intentar procesar como elemento de bloque (encabezados, separadores)
    const blockElement = processBlockElement(line);
    if (blockElement) {
      elements.push(
        <div key={elementKey++}>
          {blockElement}
        </div>
      );
      currentLineIndex++;
      continue;
    }
    
    // Procesar como línea normal
    if (line.trim() === '') {
      elements.push(<div key={elementKey++} className="h-1" />);
    } else {
      const processedLine = processInlineMarkdown(line);
      elements.push(
        <div key={elementKey++} className={elements.length > 0 ? 'mt-0.5' : ''}>
          {processedLine}
        </div>
      );
    }
    
    currentLineIndex++;
  }
  
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {elements}
    </div>
  );
};