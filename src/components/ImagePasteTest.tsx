import React, { useState } from 'react';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { ImageService } from '@/services/imageService';

// Componente de prueba para verificar el pegado de imágenes
export const ImagePasteTest: React.FC = () => {
  const [content, setContent] = useState('');
  
  const testBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  
  const insertTestBase64 = () => {
    setContent(prev => prev + '\n\nTexto base64 de prueba:\n' + testBase64);
  };
  
  const checkForImages = () => {
    const hasImages = ImageService.containsBase64Images(content);
    alert(`¿Contiene imágenes base64? ${hasImages ? 'Sí' : 'No'}`);
  };
  
  return (
    <div className="p-4 space-y-4 border border-border rounded-lg">
      <h3 className="text-lg font-semibold">Prueba de pegado de imágenes</h3>
      
      <div className="space-y-2">
        <Button onClick={insertTestBase64} variant="outline" size="sm">
          Insertar base64 de prueba
        </Button>
        <Button onClick={checkForImages} variant="outline" size="sm">
          Verificar imágenes
        </Button>
      </div>
      
      <RichTextEditor
        value={content}
        onChange={setContent}
        placeholder="Pega una imagen aquí para probar..."
      />
      
      <div className="text-xs text-muted-foreground">
        <strong>Instrucciones:</strong>
        <br />
        1. Copia una imagen (Ctrl+C en cualquier imagen)
        <br />
        2. Pégala aquí (Ctrl+V)
        <br />
        3. Debería convertirse automáticamente a imagen visible
      </div>
    </div>
  );
};