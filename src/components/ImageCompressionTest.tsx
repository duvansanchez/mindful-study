import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageService } from '@/services/imageService';
import { Upload, Info } from 'lucide-react';

export const ImageCompressionTest: React.FC = () => {
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [compressionRatio, setCompressionRatio] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileTest = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsProcessing(true);
    setOriginalSize(file.size);

    try {
      console.log('🧪 Iniciando prueba de compresión...');
      
      // Comprimir con configuración actual
      let compressed = await ImageService.compressImage(file, 600, 0.7);
      
      // Verificar tamaño y comprimir más si es necesario
      compressed = await ImageService.ensureImageSize(compressed, 2);
      
      const finalSize = Math.round((compressed.length * 3) / 4);
      setCompressedSize(finalSize);
      
      const ratio = ((file.size - finalSize) / file.size) * 100;
      setCompressionRatio(ratio);
      
      console.log('✅ Prueba completada:');
      console.log(`  - Original: ${ImageService.formatFileSize(file.size)}`);
      console.log(`  - Comprimido: ${ImageService.formatFileSize(finalSize)}`);
      console.log(`  - Reducción: ${ratio.toFixed(1)}%`);
      
    } catch (error) {
      console.error('❌ Error en prueba:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Prueba de Compresión
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Sube una imagen para probar la compresión actual
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileTest}
          className="hidden"
          id="test-file-input"
        />
        
        <Button
          onClick={() => document.getElementById('test-file-input')?.click()}
          disabled={isProcessing}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isProcessing ? 'Procesando...' : 'Seleccionar Imagen'}
        </Button>
        
        {originalSize > 0 && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Tamaño original:</span>
              <span className="font-mono">{ImageService.formatFileSize(originalSize)}</span>
            </div>
            
            {compressedSize > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Tamaño comprimido:</span>
                  <span className="font-mono">{ImageService.formatFileSize(compressedSize)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Reducción:</span>
                  <span className={`font-mono ${compressionRatio > 50 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {compressionRatio.toFixed(1)}%
                  </span>
                </div>
                
                <div className="mt-3 p-2 bg-muted rounded text-xs">
                  {compressedSize < 2 * 1024 * 1024 ? (
                    <span className="text-green-600">✅ Tamaño aceptable para servidor</span>
                  ) : (
                    <span className="text-red-600">⚠️ Aún muy grande, se comprimirá más</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};