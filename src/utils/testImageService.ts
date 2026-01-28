// Script de prueba para el servicio de imágenes
import { ImageService } from '@/services/imageService';

// Función para probar el servicio de imágenes
export const testImageService = () => {
  console.log('🧪 Probando ImageService...');
  
  // Probar validación de base64
  const validBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==';
  const invalidBase64 = 'not-a-base64-image';
  
  console.log('✅ Base64 válido:', ImageService.isValidBase64Image(validBase64));
  console.log('❌ Base64 inválido:', ImageService.isValidBase64Image(invalidBase64));
  
  // Probar información de imagen
  const imageInfo = ImageService.getImageInfo(validBase64);
  console.log('📊 Info de imagen:', imageInfo);
  
  // Probar formateo de tamaño
  console.log('📏 Formateo de tamaños:');
  console.log('  1024 bytes:', ImageService.formatFileSize(1024));
  console.log('  1048576 bytes:', ImageService.formatFileSize(1048576));
  console.log('  5242880 bytes:', ImageService.formatFileSize(5242880));
  
  console.log('✅ Pruebas completadas');
};

// Ejecutar pruebas si estamos en desarrollo
if (import.meta.env.DEV) {
  // testImageService();
}