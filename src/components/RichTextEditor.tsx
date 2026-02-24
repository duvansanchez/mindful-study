import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Image, Bold, Italic, Link2, Type, Table, Loader2, AlertCircle, Minus } from 'lucide-react';
import { ImageService } from '@/services/imageService';
import { toast } from 'sonner';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoResize?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Escribe tu nota...",
  disabled = false,
  className = "",
  autoResize = false,
}) => {
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoResize && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value, autoResize]);

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

  // Convertir archivo a base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Detectar y convertir texto base64 de imagen pegado
  const detectAndConvertBase64Images = (text: string): string => {
    // Verificar si hay imágenes base64 en el texto
    if (!ImageService.containsBase64Images(text)) {
      return text;
    }
    
    // Patrón para detectar datos base64 de imagen que se pegaron como texto
    const base64Pattern = /data:image\/[^;]+;base64,[A-Za-z0-9+/=\s]+/g;
    
    return text.replace(base64Pattern, (match) => {
      console.log('🔄 Convirtiendo texto base64 a markdown de imagen');
      
      // Limpiar el base64
      const cleanedBase64 = ImageService.cleanBase64Image(match);
      if (!cleanedBase64) {
        console.warn('⚠️ Base64 inválido, manteniendo texto original');
        return match;
      }
      
      // Verificar tamaño
      const imageInfo = ImageService.getImageInfo(cleanedBase64);
      if (imageInfo && imageInfo.size > 5 * 1024 * 1024) {
        console.warn('⚠️ Imagen demasiado grande, manteniendo texto original');
        toast.warning('Imagen demasiado grande para convertir automáticamente');
        return match;
      }
      
      return `![Imagen pegada](${cleanedBase64})`;
    });
  };

  // Manejar pegado - simplificado para evitar conflictos
  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Solo intentar detectar imágenes si no estamos procesando ya
    if (isProcessingImage) {
      return;
    }
    
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    console.log('📋 Pegado detectado, items:', clipboardData.items.length);
    
    // Buscar imágenes en el portapapeles
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      console.log(`📋 Item ${i}: tipo=${item.type}, kind=${item.kind}`);
      
      // Solo procesar si es claramente un archivo de imagen
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        console.log('🖼️ Imagen detectada en el portapapeles - procesando...');
        event.preventDefault(); // Prevenir pegado por defecto
        
        const file = item.getAsFile();
        if (file) {
          setIsProcessingImage(true);
          
          try {
            console.log(`📷 Procesando imagen pegada: tamaño=${file.size} bytes, tipo=${file.type}`);
            
            if (file.size > 10 * 1024 * 1024) { // 10MB
              toast.error('La imagen pegada es demasiado grande. Usa el botón "Subir Imagen" para archivos grandes.');
              return;
            }
            
            let compressedBase64 = await ImageService.compressImage(file, 600, 0.7);
            
            // Verificar tamaño final y comprimir más si es necesario
            compressedBase64 = await ImageService.ensureImageSize(compressedBase64, 2);
            const imageMarkdown = `![Imagen pegada](${compressedBase64})`;
            
            insertText('\n' + imageMarkdown + '\n');
            toast.success('Imagen pegada correctamente');
            
          } catch (error) {
            console.error('❌ Error procesando imagen pegada:', error);
            toast.error('Error al procesar la imagen pegada. Usa el botón "Subir Imagen" como alternativa.');
          } finally {
            setIsProcessingImage(false);
          }
        }
        return; // Solo procesar la primera imagen
      }
    }
    
    // Si llegamos aquí, no había imágenes - permitir pegado normal
    console.log('📋 No se detectaron imágenes, permitiendo pegado normal de texto');
  };

  // Manejar subida de archivo de imagen
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      console.log('❌ No se seleccionó ningún archivo');
      return;
    }
    
    console.log(`📁 Archivo seleccionado: ${file.name}, tipo: ${file.type}, tamaño: ${file.size} bytes`);
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido');
      return;
    }
    
    setIsProcessingImage(true);
    
    try {
      // Verificar tamaño del archivo
      if (file.size > 10 * 1024 * 1024) { // 10MB para archivos subidos
        toast.error('La imagen es demasiado grande. Máximo 10MB permitido.');
        return;
      }
      
      console.log('🔄 Iniciando compresión de imagen...');
      
      // Comprimir imagen antes de insertar (más agresivo para evitar error 413)
      let compressedBase64 = await ImageService.compressImage(file, 600, 0.7);
      
      // Verificar tamaño final y comprimir más si es necesario
      compressedBase64 = await ImageService.ensureImageSize(compressedBase64, 2);
      const imageInfo = ImageService.getImageInfo(compressedBase64);
      
      if (imageInfo) {
        const sizeText = ImageService.formatFileSize(imageInfo.size);
        console.log(`✅ Imagen comprimida exitosamente: ${sizeText} (${imageInfo.type})`);
      }
      
      // Crear markdown con nombre del archivo
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remover extensión
      const imageMarkdown = `![${fileName}](${compressedBase64})`;
      
      // Insertar en el editor
      insertText('\n' + imageMarkdown + '\n');
      
      toast.success(`Imagen "${fileName}" agregada correctamente`);
      
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      toast.error('Error al procesar la imagen. Intenta con otra imagen.');
    } finally {
      setIsProcessingImage(false);
      
      // Limpiar el input para permitir subir la misma imagen de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Insertar tabla básica
  const handleInsertTable = () => {
    const tableMarkdown = `| Característica | Columna 1 | Columna 2 |
| --- | --- | --- |
| Fila 1 | Dato 1 | Dato 2 |
| Fila 2 | Dato 3 | Dato 4 |`;
    insertText(tableMarkdown);
  };

  return (
    <div className={`border border-border rounded-lg ${className}`}>
      {/* Barra de herramientas */}
      <div className="flex items-center gap-0.5 p-1 border-b border-border bg-muted/30 flex-wrap">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('**')}
          disabled={disabled}
          title="Negrita"
          className="h-6 w-6 p-0"
        >
          <Bold className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('*')}
          disabled={disabled}
          title="Cursiva"
          className="h-6 w-6 p-0"
        >
          <Italic className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => wrapSelectedText('[', '](url)')}
          disabled={disabled}
          title="Enlace"
          className="h-6 w-6 p-0"
        >
          <Link2 className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            const processedValue = detectAndConvertBase64Images(value);
            if (processedValue !== value) {
              onChange(processedValue);
              toast.success('Texto base64 convertido a imágenes');
            } else {
              toast.info('No se encontró texto base64 para convertir');
            }
          }}
          disabled={disabled}
          title="Convertir texto base64 a imágenes"
          className="h-6 w-6 p-0"
        >
          <AlertCircle className="w-3 h-3" />
        </Button>

        <div className="w-px h-4 bg-border mx-0.5" />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessingImage}
          className="h-6 px-2 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30"
        >
          {isProcessingImage ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin mr-1" />
              <span className="text-[10px]">Subiendo...</span>
            </>
          ) : (
            <>
              <Image className="w-3 h-3 mr-1" />
              <span className="text-[10px] font-medium">Subir Imagen</span>
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowImageDialog(true)}
          disabled={disabled}
          title="Insertar imagen por URL"
          className="h-6 w-6 p-0"
        >
          <Link2 className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleInsertTable}
          disabled={disabled}
          title="Insertar tabla"
          className="h-6 w-6 p-0"
        >
          <Table className="w-3 h-3" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertText('\n---\n')}
          disabled={disabled}
          title="Insertar divisor"
          className="h-6 w-6 p-0"
        >
          <Minus className="w-3 h-3" />
        </Button>
      </div>

      {/* Área de texto */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            // Detectar y convertir base64 automáticamente al escribir (solo si no estamos procesando)
            if (!isProcessingImage) {
              const processedValue = detectAndConvertBase64Images(e.target.value);
              onChange(processedValue);
            } else {
              onChange(e.target.value);
            }
          }}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled || isProcessingImage}
          className={`border-0 resize-none focus-visible:ring-0 ${autoResize ? 'min-h-[120px] overflow-hidden' : 'min-h-[120px]'}`}
          rows={autoResize ? undefined : 5}
        />
        
        {/* Indicador de procesamiento de imagen */}
        {isProcessingImage && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2 text-sm text-foreground bg-card p-4 rounded-lg border shadow-lg">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-medium">Procesando imagen...</span>
              <span className="text-xs text-muted-foreground">Por favor espera</span>
            </div>
          </div>
        )}
      </div>

      {/* Input oculto para archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
        onChange={handleFileUpload}
        className="hidden"
        title="Seleccionar imagen"
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
      <div className="p-3 border-t border-border bg-muted/20">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>
            <span className="font-medium text-primary">📷 Para agregar imágenes:</span> 
            <span className="ml-1">Usa el botón "Subir Imagen" (recomendado) o pega con Ctrl+V</span>
          </div>
          <div>
            <span className="font-medium">Formato:</span> **negrita**, *cursiva*, [enlace](url), ### encabezado
          </div>
          <div>
            <span className="font-medium">Tablas:</span> | Col1 | Col2 | (usa el botón de tabla)
          </div>
          <div>
            <span className="font-medium">Límites:</span> Máximo 10MB por imagen, se comprimen automáticamente
          </div>
        </div>
      </div>
    </div>
  );
};