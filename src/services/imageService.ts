// Servicio para manejar imágenes en las notas de repaso
export class ImageService {
  // Comprimir imagen manteniendo calidad aceptable
  static async compressImage(file: File, maxWidth: number = 600, quality: number = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Si la altura también es muy grande, limitarla
        const maxHeight = 600;
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        // Configurar canvas
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con compresión más agresiva
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        // Verificar tamaño final
        const finalSize = Math.round((compressedBase64.length * 3) / 4);
        console.log(`📷 Imagen comprimida: ${width}x${height}, ${this.formatFileSize(finalSize)}`);
        
        // Si aún es muy grande, comprimir más
        if (finalSize > 2 * 1024 * 1024) { // 2MB
          console.log('⚠️ Imagen aún muy grande, comprimiendo más...');
          const moreCompressed = canvas.toDataURL('image/jpeg', 0.5);
          resolve(moreCompressed);
        } else {
          resolve(compressedBase64);
        }
      };
      
      img.onerror = reject;
      
      // Crear URL temporal para cargar la imagen
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  // Validar si una cadena es una imagen base64 válida
  static isValidBase64Image(str: string): boolean {
    const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    return base64Pattern.test(str);
  }
  
  // Obtener información de una imagen base64
  static getImageInfo(base64: string): { type: string; size: number } | null {
    if (!this.isValidBase64Image(base64)) return null;
    
    const matches = base64.match(/^data:image\/([^;]+);base64,(.+)$/);
    if (!matches) return null;
    
    const type = matches[1];
    const data = matches[2];
    
    // Calcular tamaño aproximado en bytes
    const size = Math.round((data.length * 3) / 4);
    
    return { type, size };
  }
  
  // Formatear tamaño de archivo
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  // Limpiar y validar imagen base64
  static cleanBase64Image(base64: string): string | null {
    try {
      // Remover espacios y saltos de línea
      const cleaned = base64.replace(/\s/g, '');
      
      // Verificar formato básico
      if (!this.isValidBase64Image(cleaned)) {
        return null;
      }
      
      return cleaned;
    } catch (error) {
      console.error('Error limpiando base64:', error);
      return null;
    }
  }
  
  // Detectar si un texto contiene datos base64 de imagen
  static containsBase64Images(text: string): boolean {
    const base64Pattern = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g;
    return base64Pattern.test(text);
  }
  
  // Verificar tamaño de imagen base64 y comprimir más si es necesario
  static async ensureImageSize(base64: string, maxSizeMB: number = 2): Promise<string> {
    const currentSize = Math.round((base64.length * 3) / 4);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    console.log(`📏 Tamaño actual: ${this.formatFileSize(currentSize)}, límite: ${this.formatFileSize(maxSizeBytes)}`);
    
    if (currentSize <= maxSizeBytes) {
      return base64;
    }
    
    console.log('⚠️ Imagen muy grande, comprimiendo más...');
    
    // Crear imagen temporal para recomprimir
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Reducir dimensiones más agresivamente
        let { width, height } = img;
        const scaleFactor = Math.sqrt(maxSizeBytes / currentSize);
        
        width = Math.floor(width * scaleFactor);
        height = Math.floor(height * scaleFactor);
        
        canvas.width = width;
        canvas.height = height;
        
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Comprimir con calidad muy baja
        const recompressed = canvas.toDataURL('image/jpeg', 0.4);
        const newSize = Math.round((recompressed.length * 3) / 4);
        
        console.log(`✅ Imagen recomprimida: ${width}x${height}, ${this.formatFileSize(newSize)}`);
        resolve(recompressed);
      };
      
      img.onerror = reject;
      img.src = base64;
    });
  }
  static async createThumbnail(base64: string, size: number = 150): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Crear thumbnail cuadrado
        canvas.width = size;
        canvas.height = size;
        
        // Calcular recorte para mantener aspecto cuadrado
        const minDimension = Math.min(img.width, img.height);
        const x = (img.width - minDimension) / 2;
        const y = (img.height - minDimension) / 2;
        
        // Dibujar imagen recortada y redimensionada
        ctx?.drawImage(img, x, y, minDimension, minDimension, 0, 0, size, size);
        
        // Convertir a base64
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnail);
      };
      
      img.onerror = reject;
      img.src = base64;
    });
  }
}