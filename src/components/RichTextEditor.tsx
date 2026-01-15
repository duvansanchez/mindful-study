import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Bold, Italic, Link2, Type } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Escribe tu nota...",
  disabled = false,
  className = ""
}) => {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Insertar texto en la posición del cursor
  const insertText = (textToInsert: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = value;

    const newValue = currentValue.substring(0, start) + textToInsert + currentValue.substring(end);
    onChange(newValue);

    // Restaurar el foco y posición del cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  // Envolver texto seleccionado con formato
  const wrapSelectedText = (prefix: string, suffix: string = prefix) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const currentValue = value;

    if (selectedText) {
      // Si hay texto seleccionado, envolverlo
      const newText = prefix + selectedText + suffix;
      const newValue = currentValue.substring(0, start) + newText + currentValue.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      }, 0);
    } else {
      // Si no hay texto seleccionado, insertar marcadores
      const placeholder = prefix === '**' ? 'texto en negrita' : 
                         prefix === '*' ? 'texto en cursiva' : 
                         prefix === '[' ? 'texto del enlace](url)' : 'texto';
      
      const textToInsert = prefix + placeholder + suffix;
      insertText(textToInsert);
    }
  };

  // Manejar inserción de imagen desde URL
  const handleInsertImageUrl = () => {
    if (imageUrl.trim()) {
      const imageMarkdown = `![Imagen](${imageUrl.trim()})`;
      insertText(imageMarkdown);
      setImageUrl('');
      setShowImageDialog(false);
    }
  };

  // Manejar subida de archivo de imagen
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Crear URL temporal para la imagen
      const imageUrl = URL.createObjectURL(file);
      const imageMarkdown = `![${file.name}](${imageUrl})`;
      insertText(imageMarkdown);
    }
    
    // Limpiar el input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      {/* Barra de herramientas */}
      <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('**')}
          disabled={disabled}
          title="Negrita"
          className="h-8 w-8 p-0"
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('*')}
          disabled={disabled}
          title="Cursiva"
          className="h-8 w-8 p-0"
        >
          <Italic className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('[', '](url)')}
          disabled={disabled}
          title="Enlace"
          className="h-8 w-8 p-0"
        >
          <Link2 className="w-4 h-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
          disabled={disabled}
          title="Insertar imagen"
          className="h-8 w-8 p-0"
        >
          <Image className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Subir imagen"
          className="h-8 w-8 p-0"
        >
          <Type className="w-4 h-4" />
        </Button>
      </div>

      {/* Área de texto */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="border-0 resize-none focus-visible:ring-0 min-h-[120px]"
        rows={5}
      />

      {/* Input oculto para archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Diálogo para insertar imagen por URL */}
      {showImageDialog && (
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="space-y-2">
            <label className="text-sm font-medium">URL de la imagen:</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleInsertImageUrl();
                  } else if (e.key === 'Escape') {
                    setShowImageDialog(false);
                    setImageUrl('');
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl.trim()}
              >
                Insertar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowImageDialog(false);
                  setImageUrl('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ayuda de formato */}
      <div className="p-2 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">Formato:</span> **negrita**, *cursiva*, [enlace](url), ![imagen](url)
        </div>
      </div>
    </div>
  );
};