import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { ImageService } from '@/services/imageService';
import { toast } from 'sonner';

interface SimpleImageUploaderProps {
  onImageUploaded: (imageMarkdown: string) => void;
  disabled?: boolean;
  className?: string;
}

export const SimpleImageUploader: React.FC<SimpleImageUploaderProps> = ({
  onImageUploaded,
  disabled = false,
  className = ""
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    console.log(`📁 Archivo seleccionado: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máx. 10MB)');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Crear preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      
      // Comprimir y procesar imagen (más agresivo para evitar error 413)
      console.log('🔄 Comprimiendo imagen...');
      let compressedBase64 = await ImageService.compressImage(file, 600, 0.7);
      
      // Verificar tamaño final y comprimir más si es necesario
      compressedBase64 = await ImageService.ensureImageSize(compressedBase64, 2);
      
      const imageInfo = ImageService.getImageInfo(compressedBase64);
      if (imageInfo) {
        const sizeText = ImageService.formatFileSize(imageInfo.size);
        console.log(`✅ Imagen procesada: ${sizeText}`);
      }
      
      // Crear markdown
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const imageMarkdown = `![${fileName}](${compressedBase64})`;
      
      // Notificar al componente padre
      onImageUploaded(imageMarkdown);
      
      toast.success(`Imagen "${fileName}" subida correctamente`);
      
      // Limpiar preview después de un momento
      setTimeout(() => {
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      toast.error('Error al procesar la imagen');
      setPreview(null);
    } finally {
      setIsUploading(false);
      
      // Limpiar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const clearPreview = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
      setPreview(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Botón principal de subida */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          className="flex items-center gap-2"
          variant={isUploading ? "secondary" : "default"}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Procesando...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Subir Imagen</span>
            </>
          )}
        </Button>
        
        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearPreview}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      
      {/* Preview de la imagen */}
      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="max-w-32 max-h-32 rounded border border-border object-cover"
          />
          <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
            <ImageIcon className="w-3 h-3" />
          </div>
        </div>
      )}
      
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Información */}
      <div className="text-xs text-muted-foreground">
        Formatos: JPG, PNG, GIF, WebP • Máximo: 10MB
      </div>
    </div>
  );
};