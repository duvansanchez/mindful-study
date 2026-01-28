import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { SimpleImageUploader } from './SimpleImageUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Eye, Edit3, Image } from 'lucide-react';

interface EnhancedNoteEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const EnhancedNoteEditor: React.FC<EnhancedNoteEditorProps> = ({
  value,
  onChange,
  placeholder = "Escribe tu nota...",
  disabled = false,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'images'>('edit');

  const handleImageUploaded = (imageMarkdown: string) => {
    // Agregar la imagen al final del contenido actual
    const newContent = value ? `${value}\n\n${imageMarkdown}` : imageMarkdown;
    onChange(newContent);
    
    // Cambiar a la pestaña de edición para ver el resultado
    setActiveTab('edit');
  };

  const handleImageClick = (imageUrl: string, caption?: string) => {
    // Aquí podrías abrir un modal para ver la imagen en tamaño completo
    console.log('Imagen clickeada:', imageUrl, caption);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Editor de Notas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              <span>Editar</span>
            </TabsTrigger>
            <TabsTrigger value="images" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              <span>Imágenes</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>Vista Previa</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="mt-4">
            <RichTextEditor
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              disabled={disabled}
            />
          </TabsContent>
          
          <TabsContent value="images" className="mt-4">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Sube imágenes de forma confiable usando el botón de abajo. 
                Las imágenes se agregarán automáticamente a tu nota.
              </div>
              
              <SimpleImageUploader
                onImageUploaded={handleImageUploaded}
                disabled={disabled}
              />
              
              {value && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium mb-2">Contenido actual:</h4>
                  <div className="max-h-32 overflow-y-auto bg-muted/30 p-3 rounded text-xs font-mono">
                    {value || 'Sin contenido'}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <div className="min-h-32 p-4 border border-border rounded-lg bg-background">
              {value ? (
                <MarkdownRenderer 
                  content={value} 
                  onImageClick={handleImageClick}
                />
              ) : (
                <div className="text-muted-foreground text-center py-8">
                  Sin contenido para mostrar
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};