import React, { useState } from 'react';
import { EnhancedNoteEditor } from './EnhancedNoteEditor';
import { RichTextEditor } from './RichTextEditor';
import { SimpleImageUploader } from './SimpleImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';

// Componente de ejemplo para mostrar las diferentes opciones de subida de imágenes
export const ImageUploadExample: React.FC = () => {
  const [content1, setContent1] = useState('');
  const [content2, setContent2] = useState('');
  const [content3, setContent3] = useState('');

  return (
    <div className="space-y-6 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Opciones para Subir Imágenes</h2>
        <p className="text-muted-foreground">
          Elige la opción que mejor funcione para ti
        </p>
      </div>

      {/* Opción 1: Editor Mejorado con Pestañas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-green-600">
            ✅ OPCIÓN 1: Editor Completo (RECOMENDADO)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Editor con pestañas separadas para texto, imágenes y vista previa
          </p>
        </CardHeader>
        <CardContent>
          <EnhancedNoteEditor
            value={content1}
            onChange={setContent1}
            placeholder="Escribe tu nota aquí..."
          />
        </CardContent>
      </Card>

      {/* Opción 2: Editor Original Mejorado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-blue-600">
            ✅ OPCIÓN 2: Editor Tradicional Mejorado
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Editor tradicional con botón "Subir Imagen" más prominente
          </p>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={content2}
            onChange={setContent2}
            placeholder="Escribe tu nota y usa el botón 'Subir Imagen'..."
          />
          
          {content2 && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/20">
              <h4 className="text-sm font-medium mb-2">Vista previa:</h4>
              <MarkdownRenderer content={content2} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opción 3: Subidor Simple */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-purple-600">
            ✅ OPCIÓN 3: Subidor Simple + Editor Básico
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Subidor de imágenes separado + editor de texto básico
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SimpleImageUploader
            onImageUploaded={(imageMarkdown) => {
              setContent3(prev => prev ? `${prev}\n\n${imageMarkdown}` : imageMarkdown);
            }}
          />
          
          <RichTextEditor
            value={content3}
            onChange={setContent3}
            placeholder="El contenido de las imágenes aparecerá aquí..."
          />
          
          {content3 && (
            <div className="mt-4 p-4 border border-border rounded-lg bg-muted/20">
              <h4 className="text-sm font-medium mb-2">Resultado:</h4>
              <MarkdownRenderer content={content3} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones */}
      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-lg text-yellow-800 dark:text-yellow-200">
            📋 Instrucciones de Uso
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div><strong>Para subir imágenes:</strong></div>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Haz clic en el botón "Subir Imagen" (azul)</li>
            <li>Selecciona tu archivo de imagen (JPG, PNG, GIF, WebP)</li>
            <li>Espera a que se procese (se comprime automáticamente)</li>
            <li>La imagen aparecerá en tu nota</li>
          </ul>
          
          <div className="mt-4"><strong>Formatos soportados:</strong></div>
          <p>JPEG, PNG, GIF, WebP, BMP • Máximo 10MB por imagen</p>
          
          <div className="mt-4"><strong>¿Problemas con el pegado?</strong></div>
          <p>Usa el botón "Subir Imagen" que es 100% confiable</p>
        </CardContent>
      </Card>
    </div>
  );
};