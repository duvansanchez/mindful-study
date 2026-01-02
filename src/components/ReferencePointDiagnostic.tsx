import React, { useState } from 'react';
import { ReferencePoint } from '@/hooks/useReferencePoints';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, CheckCircle, Copy, RefreshCw } from 'lucide-react';

interface ReferencePointDiagnosticProps {
  referencePoint: ReferencePoint;
  contentText: string;
  onUpdateReferencePoint?: (updates: Partial<ReferencePoint>) => void;
}

const canonicalizeWhitespaceWithMap = (input: string) => {
  let canon = '';
  const map: number[] = [];
  let inWs = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const isZeroWidth = ch === '\u200B' || ch === '\u200C' || ch === '\u200D' || ch === '\uFEFF';
    const isNbsp = ch === '\u00A0' || ch === '\u202F';
    const isWs = isZeroWidth || isNbsp || /\s/.test(ch);

    if (isWs) {
      if (!inWs) {
        canon += ' ';
        map.push(i);
        inWs = true;
      }
      continue;
    }

    inWs = false;
    canon += ch;
    map.push(i);
  }

  return { canon, map };
};

export const ReferencePointDiagnostic: React.FC<ReferencePointDiagnosticProps> = ({
  referencePoint,
  contentText,
  onUpdateReferencePoint
}) => {
  const [newSelectedText, setNewSelectedText] = useState(referencePoint.selectedText);
  const [newContextBefore, setNewContextBefore] = useState(referencePoint.contextBefore || '');
  const [newContextAfter, setNewContextAfter] = useState(referencePoint.contextAfter || '');

  // Análisis de búsqueda
  const analyzeSearch = () => {
    const results = {
      exactMatch: false,
      exactMatches: [] as number[],
      canonicalMatch: false,
      canonicalMatches: [] as number[],
      contextMatch: false,
      flexibleMatch: false,
      flexibleMatches: [] as number[],
      suggestions: [] as string[]
    };

    // Búsqueda exacta
    let fromIndex = 0;
    while (fromIndex <= contentText.length) {
      const idx = contentText.indexOf(referencePoint.selectedText, fromIndex);
      if (idx === -1) break;
      results.exactMatches.push(idx);
      fromIndex = idx + Math.max(1, referencePoint.selectedText.length);
    }
    results.exactMatch = results.exactMatches.length > 0;

    // Búsqueda canónica
    const { canon: canonContent } = canonicalizeWhitespaceWithMap(contentText);
    const { canon: canonNeedle } = canonicalizeWhitespaceWithMap(referencePoint.selectedText);
    
    fromIndex = 0;
    while (fromIndex <= canonContent.length) {
      const idx = canonContent.indexOf(canonNeedle, fromIndex);
      if (idx === -1) break;
      results.canonicalMatches.push(idx);
      fromIndex = idx + Math.max(1, canonNeedle.length);
    }
    results.canonicalMatch = results.canonicalMatches.length > 0;

    // Búsqueda flexible (para texto dividido por HTML)
    const words = referencePoint.selectedText.trim().split(/\s+/);
    if (words.length >= 2) {
      const firstWord = words[0];
      const lastWord = words[words.length - 1];
      
      // Buscar primera palabra
      const firstWordRegex = new RegExp(`\\b${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      let match;
      while ((match = firstWordRegex.exec(contentText)) !== null) {
        // Buscar la última palabra dentro de un rango razonable
        const searchStart = match.index;
        const searchEnd = Math.min(contentText.length, searchStart + referencePoint.selectedText.length * 2);
        const searchArea = contentText.slice(searchStart, searchEnd);
        
        if (searchArea.toLowerCase().includes(lastWord.toLowerCase())) {
          results.flexibleMatches.push(searchStart);
          results.flexibleMatch = true;
        }
      }
    }

    // Verificar contexto si hay múltiples coincidencias
    if (results.exactMatches.length > 1 && referencePoint.contextBefore && referencePoint.contextAfter) {
      for (const idx of results.exactMatches) {
        const before = contentText.slice(Math.max(0, idx - referencePoint.contextBefore.length), idx);
        const after = contentText.slice(idx + referencePoint.selectedText.length, 
          idx + referencePoint.selectedText.length + referencePoint.contextAfter.length);
        
        if (before === referencePoint.contextBefore && after === referencePoint.contextAfter) {
          results.contextMatch = true;
          break;
        }
      }
    }

    // Generar sugerencias específicas
    if (!results.exactMatch) {
      if (results.flexibleMatch) {
        results.suggestions.push('El texto parece estar dividido por formato HTML. Usa la búsqueda flexible.');
      }
      
      if (results.canonicalMatch) {
        results.suggestions.push('El texto existe pero con diferencias en espacios o caracteres especiales.');
      }

      // Buscar texto similar
      const words = referencePoint.selectedText.split(/\s+/);
      const longestWord = words.reduce((a, b) => a.length > b.length ? a : b, '');
      
      if (longestWord.length >= 4) {
        const regex = new RegExp(longestWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = contentText.match(regex);
        if (matches) {
          results.suggestions.push(`Palabra clave "${longestWord}" encontrada ${matches.length} veces`);
        }
      }

      // Buscar texto parcial
      const firstWords = words.slice(0, Math.min(3, words.length)).join(' ');
      if (contentText.toLowerCase().includes(firstWords.toLowerCase())) {
        results.suggestions.push(`Texto parcial "${firstWords}" encontrado`);
      }
    }

    return results;
  };

  const searchResults = analyzeSearch();

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleUpdateReference = () => {
    if (onUpdateReferencePoint) {
      onUpdateReferencePoint({
        selectedText: newSelectedText,
        contextBefore: newContextBefore,
        contextAfter: newContextAfter
      });
    }
  };

  const findSimilarText = () => {
    // Buscar texto similar en el contenido
    const words = referencePoint.selectedText.toLowerCase().split(/\s+/);
    const contentLower = contentText.toLowerCase();
    
    const suggestions: Array<{text: string, position: number, similarity: number, type: string}> = [];
    
    // 1. Buscar por ventana deslizante (método original)
    const windowSize = words.length;
    const contentWords = contentLower.split(/\s+/);
    
    for (let i = 0; i <= contentWords.length - windowSize; i++) {
      const window = contentWords.slice(i, i + windowSize);
      const windowText = window.join(' ');
      
      // Calcular similitud simple (palabras en común)
      const commonWords = words.filter(word => window.includes(word));
      const similarity = commonWords.length / words.length;
      
      if (similarity >= 0.5) { // Al menos 50% de similitud
        const position = contentText.toLowerCase().indexOf(windowText);
        if (position !== -1) {
          const originalText = contentText.slice(position, position + windowText.length);
          suggestions.push({
            text: originalText,
            position,
            similarity,
            type: 'Ventana completa'
          });
        }
      }
    }
    
    // 2. Buscar palabras clave individuales
    const keyWords = words.filter(word => word.length >= 4); // Solo palabras de 4+ caracteres
    for (const keyWord of keyWords) {
      const regex = new RegExp(`\\b${keyWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = regex.exec(contentText)) !== null) {
        // Extraer contexto alrededor de la palabra clave
        const start = Math.max(0, match.index - 20);
        const end = Math.min(contentText.length, match.index + keyWord.length + 20);
        const contextText = contentText.slice(start, end);
        
        suggestions.push({
          text: contextText,
          position: start,
          similarity: 0.3, // Menor prioridad para palabras individuales
          type: `Palabra clave: "${keyWord}"`
        });
      }
    }
    
    // 3. Buscar texto dividido (para casos como "El módulo puede" dividido por HTML)
    if (words.length >= 2) {
      const firstWord = words[0];
      const lastWord = words[words.length - 1];
      
      // Buscar primera palabra
      const firstWordRegex = new RegExp(`\\b${firstWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
      let match;
      while ((match = firstWordRegex.exec(contentText)) !== null) {
        // Buscar la última palabra dentro de un rango razonable
        const searchStart = match.index;
        const searchEnd = Math.min(contentText.length, searchStart + referencePoint.selectedText.length * 2);
        const searchArea = contentText.slice(searchStart, searchEnd);
        
        if (searchArea.toLowerCase().includes(lastWord)) {
          suggestions.push({
            text: searchArea,
            position: searchStart,
            similarity: 0.7, // Alta prioridad para texto posiblemente dividido
            type: 'Texto posiblemente dividido'
          });
        }
      }
    }
    
    // Ordenar por similitud y eliminar duplicados
    const uniqueSuggestions = suggestions.filter((item, index, self) => 
      index === self.findIndex(t => t.text === item.text)
    );
    
    return uniqueSuggestions.sort((a, b) => b.similarity - a.similarity).slice(0, 8);
  };

  const similarTexts = findSimilarText();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2">
        <Search className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Diagnóstico de Punto de Referencia</h3>
      </div>

      {/* Información del punto de referencia */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Información del Punto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre:</label>
            <p className="text-sm">{referencePoint.referenceName}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Texto buscado:</label>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-muted p-1 rounded flex-1">"{referencePoint.selectedText}"</code>
              <Button size="sm" variant="ghost" onClick={() => handleCopyText(referencePoint.selectedText)}>
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {referencePoint.contextBefore && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contexto anterior:</label>
              <code className="text-xs bg-muted p-1 rounded block">"{referencePoint.contextBefore}"</code>
            </div>
          )}
          {referencePoint.contextAfter && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contexto posterior:</label>
              <code className="text-xs bg-muted p-1 rounded block">"{referencePoint.contextAfter}"</code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultados del análisis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resultados de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {searchResults.exactMatch ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              Búsqueda exacta: {searchResults.exactMatch ? 
                `${searchResults.exactMatches.length} coincidencia(s)` : 
                'No encontrado'
              }
            </span>
          </div>

          <div className="flex items-center gap-2">
            {searchResults.canonicalMatch ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              Búsqueda normalizada: {searchResults.canonicalMatch ? 
                `${searchResults.canonicalMatches.length} coincidencia(s)` : 
                'No encontrado'
              }
            </span>
          </div>

          <div className="flex items-center gap-2">
            {searchResults.flexibleMatch ? (
              <CheckCircle className="w-4 h-4 text-blue-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-sm">
              Búsqueda flexible (texto dividido): {searchResults.flexibleMatch ? 
                `${searchResults.flexibleMatches.length} coincidencia(s)` : 
                'No encontrado'
              }
            </span>
          </div>

          {searchResults.exactMatches.length > 1 && (
            <div className="flex items-center gap-2">
              {searchResults.contextMatch ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-sm">
                Contexto: {searchResults.contextMatch ? 'Coincide' : 'No coincide'}
              </span>
            </div>
          )}

          {searchResults.suggestions.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Sugerencias:</label>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                {searchResults.suggestions.map((suggestion, i) => (
                  <li key={i}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Textos similares encontrados */}
      {similarTexts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Textos Similares Encontrados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {similarTexts.map((similar, i) => (
              <div key={i} className="p-2 border rounded bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {Math.round(similar.similarity * 100)}% similar
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {similar.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">Pos: {similar.position}</span>
                </div>
                <code className="text-xs block mb-2 p-1 bg-background rounded">"{similar.text}"</code>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="mt-1 h-6 text-xs"
                  onClick={() => setNewSelectedText(similar.text.trim())}
                >
                  Usar este texto
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Editor para corregir el punto de referencia */}
      {!searchResults.exactMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Corregir Punto de Referencia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Nuevo texto:</label>
              <Textarea
                value={newSelectedText}
                onChange={(e) => setNewSelectedText(e.target.value)}
                className="text-sm"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contexto anterior:</label>
              <Textarea
                value={newContextBefore}
                onChange={(e) => setNewContextBefore(e.target.value)}
                className="text-sm"
                rows={1}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Contexto posterior:</label>
              <Textarea
                value={newContextAfter}
                onChange={(e) => setNewContextAfter(e.target.value)}
                className="text-sm"
                rows={1}
              />
            </div>
            <Button onClick={handleUpdateReference} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar Punto de Referencia
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};