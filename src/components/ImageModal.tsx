import React from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Pen, Eraser, Highlighter } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  caption?: string;
  alt?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  caption,
  alt
}) => {
  const [zoom, setZoom] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  
  // Estados para dibujo
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [drawingMode, setDrawingMode] = React.useState<'pen' | 'highlighter' | 'eraser' | null>(null);
  const [drawingColor, setDrawingColor] = React.useState('#ff0000'); // Color por defecto: rojo
  const [highlighterColor, setHighlighterColor] = React.useState('#ffff00'); // Color por defecto del resaltador: amarillo
  const [highlighterOpacity, setHighlighterOpacity] = React.useState(0.4); // Opacidad del resaltador (0.1 a 0.8)
  const [highlighterThickness, setHighlighterThickness] = React.useState(15); // Grosor del resaltador (5 a 30)
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  // Reset zoom, rotation, position and drawing when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setDrawingMode(null);
      setIsDrawing(false);
      
      // Limpiar canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  }, [isOpen]);

  // Keyboard shortcuts and close modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          toggleDrawingMode('pen');
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          toggleDrawingMode('highlighter');
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          toggleDrawingMode('eraser');
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          clearCanvas();
          break;
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      // Cerrar selector de colores si se hace clic fuera
      if (showColorPicker) {
        const target = e.target as Element;
        if (!target.closest('[data-color-picker]')) {
          setShowColorPicker(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, showColorPicker]);

  // Actualizar tamaño del canvas cuando cambie la imagen
  React.useEffect(() => {
    if (isOpen && imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      
      const updateCanvasSize = () => {
        // Obtener el tamaño natural de visualización de la imagen (sin zoom)
        const container = img.parentElement;
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const imgNaturalRatio = img.naturalWidth / img.naturalHeight;
        
        // Calcular el tamaño que tendría la imagen sin zoom para llenar el contenedor
        let baseWidth: number, baseHeight: number;
        
        if (imgNaturalRatio > (containerRect.width / containerRect.height)) {
          // La imagen es más ancha proporcionalmente
          baseWidth = Math.min(containerRect.width - 16, img.naturalWidth);
          baseHeight = baseWidth / imgNaturalRatio;
        } else {
          // La imagen es más alta proporcionalmente
          baseHeight = Math.min(containerRect.height - 16, img.naturalHeight);
          baseWidth = baseHeight * imgNaturalRatio;
        }
        
        // El canvas debe tener el tamaño base (sin zoom)
        canvas.width = baseWidth;
        canvas.height = baseHeight;
        
        // Limpiar el canvas cuando cambie de tamaño
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      };
      
      // Esperar a que la imagen se cargue
      if (img.complete && img.naturalWidth > 0) {
        setTimeout(updateCanvasSize, 100);
      } else {
        img.onload = () => setTimeout(updateCanvasSize, 100);
      }
      
      // Actualizar cuando cambie el tamaño de la ventana
      const handleResize = () => setTimeout(updateCanvasSize, 100);
      window.addEventListener('resize', handleResize);
      
      const timeoutId = setTimeout(updateCanvasSize, 200);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(timeoutId);
      };
    }
  }, [isOpen, imageUrl]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = alt || 'imagen-notion';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleDrawingMode = (mode: 'pen' | 'highlighter' | 'eraser') => {
    if (drawingMode === mode) {
      setDrawingMode(null);
    } else {
      setDrawingMode(mode);
    }
  };

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Colores predefinidos para lápiz
  const predefinedColors = [
    '#ff0000', // Rojo
    '#00ff00', // Verde
    '#0000ff', // Azul
    '#ffff00', // Amarillo
    '#ff00ff', // Magenta
    '#00ffff', // Cian
    '#ffa500', // Naranja
    '#800080', // Púrpura
    '#000000', // Negro
    '#ffffff', // Blanco
  ];

  // Colores predefinidos para resaltador (colores fluorescentes típicos)
  const highlighterColors = [
    '#ffff00', // Amarillo fluorescente clásico
    '#00ff41', // Verde fluorescente
    '#ff6b9d', // Rosa fluorescente
    '#00d4ff', // Azul fluorescente
    '#ff8c00', // Naranja fluorescente
    '#c724b1', // Magenta fluorescente
    '#39ff14', // Verde neón
    '#ff073a', // Rojo fluorescente
    '#bf00ff', // Violeta fluorescente
    '#ffb347', // Melocotón fluorescente
  ];

  // Funciones de dibujo
  const getCanvasCoordinates = (e: React.MouseEvent) => {
    if (!canvasRef.current || !imageRef.current) return null;
    
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    // Obtener las coordenadas del mouse relativas a la ventana
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Obtener la posición y tamaño de la imagen transformada
    const imageRect = image.getBoundingClientRect();
    
    // Calcular las coordenadas relativas a la imagen
    const relativeX = mouseX - imageRect.left;
    const relativeY = mouseY - imageRect.top;
    
    // Ajustar por el zoom y la transformación
    // Convertir las coordenadas de la imagen transformada a coordenadas del canvas
    const canvasX = (relativeX / zoom);
    const canvasY = (relativeY / zoom);
    
    return {
      x: canvasX,
      y: canvasY
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (!drawingMode || !canvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    setIsDrawing(true);
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      
      // Configurar el estilo de dibujo
      if (drawingMode === 'pen') {
        ctx.lineWidth = 2 / zoom;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = drawingColor;
        ctx.globalAlpha = 1.0; // Opaco
      } else if (drawingMode === 'highlighter') {
        ctx.lineWidth = highlighterThickness / zoom; // Usar grosor ajustable
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = highlighterColor;
        ctx.globalAlpha = highlighterOpacity; // Usar opacidad ajustable
      } else {
        ctx.lineWidth = 8 / zoom;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isDrawing || !drawingMode || !canvasRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getCanvasCoordinates(e);
    if (!coords) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      // Configurar el estilo de dibujo ANTES de cada trazo
      if (drawingMode === 'pen') {
        ctx.lineWidth = 2 / zoom;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = drawingColor;
        ctx.globalAlpha = 1.0;
      } else if (drawingMode === 'highlighter') {
        ctx.lineWidth = highlighterThickness / zoom; // Usar grosor ajustable
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = highlighterColor;
        ctx.globalAlpha = highlighterOpacity;
      } else {
        ctx.lineWidth = 8 / zoom;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 1.0;
      }
      
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Handle mouse events - un solo manejador que decide qué hacer
  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawingMode) {
      // Modo dibujo
      e.preventDefault();
      e.stopPropagation();
      startDrawing(e);
    } else if (zoom > 1) {
      // Modo movimiento de imagen
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (drawingMode && isDrawing) {
      // Modo dibujo
      e.preventDefault();
      e.stopPropagation();
      draw(e);
    } else if (!drawingMode && isDragging && zoom > 1) {
      // Modo movimiento de imagen
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    if (drawingMode) {
      stopDrawing();
    } else {
      setIsDragging(false);
    }
  };

  const handleMouseLeave = () => {
    if (drawingMode) {
      stopDrawing();
    } else {
      setIsDragging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 w-[98vw] h-[98vh] flex flex-col">
        {/* Header with controls */}
        <div className="flex items-center justify-between p-4 bg-black/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Alejar (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            
            <span className="text-white text-sm font-medium min-w-[60px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Acercar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            <div className="w-px h-6 bg-white/30 mx-2" />
            
            {/* Drawing controls */}
            <button
              onClick={() => toggleDrawingMode('pen')}
              className={`p-2 text-white rounded-lg transition-colors ${
                drawingMode === 'pen' ? 'bg-red-500' : 'hover:bg-white/20'
              }`}
              title="Dibujar (D)"
            >
              <Pen className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => toggleDrawingMode('highlighter')}
              className={`p-2 text-white rounded-lg transition-colors ${
                drawingMode === 'highlighter' ? 'bg-yellow-500' : 'hover:bg-white/20'
              }`}
              title="Resaltador (H)"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            
            {/* Color selector - visible para lápiz y resaltador */}
            {(drawingMode === 'pen' || drawingMode === 'highlighter') && (
              <div className="relative" data-color-picker>
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors border-2 border-white/30"
                  title="Seleccionar color"
                  style={{ backgroundColor: drawingMode === 'pen' ? drawingColor : highlighterColor }}
                >
                  <div className="w-4 h-4 rounded-full border border-white/50" />
                </button>
                
                {/* Panel de colores */}
                {showColorPicker && (
                  <div className="absolute top-full mt-2 left-0 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-white/20 z-50 min-w-[280px]">
                    <div className="text-white text-xs mb-2 font-medium">
                      {drawingMode === 'pen' ? 'Colores de lápiz' : 'Colores de resaltador'}
                    </div>
                    
                    {/* Control de opacidad - solo para resaltador */}
                    {drawingMode === 'highlighter' && (
                      <div className="mb-3 space-y-3">
                        {/* Control de opacidad */}
                        <div className="p-2 bg-white/10 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-xs font-medium">Opacidad</span>
                            <span className="text-white text-xs">{Math.round(highlighterOpacity * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="0.8"
                            step="0.05"
                            value={highlighterOpacity}
                            onChange={(e) => setHighlighterOpacity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-white text-xs mt-1 opacity-70">
                            <span>Muy sutil (10%)</span>
                            <span>Intenso (80%)</span>
                          </div>
                        </div>
                        
                        {/* Control de grosor */}
                        <div className="p-2 bg-white/10 rounded">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-xs font-medium">Grosor</span>
                            <span className="text-white text-xs">{highlighterThickness}px</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="30"
                            step="1"
                            value={highlighterThickness}
                            onChange={(e) => setHighlighterThickness(parseInt(e.target.value))}
                            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-white text-xs mt-1 opacity-70">
                            <span>Fino (5px)</span>
                            <span>Grueso (30px)</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {(drawingMode === 'pen' ? predefinedColors : highlighterColors).map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            if (drawingMode === 'pen') {
                              setDrawingColor(color);
                            } else {
                              setHighlighterColor(color);
                            }
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                            (drawingMode === 'pen' ? drawingColor : highlighterColor) === color ? 'border-white' : 'border-white/30'
                          }`}
                          style={{ backgroundColor: color }}
                          title={`Color ${color}`}
                        />
                      ))}
                    </div>
                    
                    {/* Selector de color personalizado */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={drawingMode === 'pen' ? drawingColor : highlighterColor}
                        onChange={(e) => {
                          if (drawingMode === 'pen') {
                            setDrawingColor(e.target.value);
                          } else {
                            setHighlighterColor(e.target.value);
                          }
                        }}
                        className="w-8 h-8 rounded border border-white/30 bg-transparent cursor-pointer"
                        title="Color personalizado"
                      />
                      <span className="text-white text-xs">Personalizado</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={() => toggleDrawingMode('eraser')}
              className={`p-2 text-white rounded-lg transition-colors ${
                drawingMode === 'eraser' ? 'bg-blue-500' : 'hover:bg-white/20'
              }`}
              title="Borrador (E)"
            >
              <Eraser className="w-4 h-4" />
            </button>
            
            <button
              onClick={clearCanvas}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors text-xs px-3"
              title="Limpiar dibujo (C)"
            >
              Limpiar
            </button>
            
            <div className="w-px h-6 bg-white/30 mx-2" />
            
            {/* Other controls */}
            <button
              onClick={handleRotate}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Rotar"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Descargar"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Keyboard shortcuts help */}
            <div className="text-white text-xs opacity-70">
              <span className="font-medium">Atajos:</span> +/- (zoom), D (dibujar), H (resaltar), E (borrar), C (limpiar)
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Image container */}
        <div className="flex-1 overflow-hidden bg-black/30 rounded-b-lg p-2 relative">
          <div className="flex items-center justify-center h-full w-full relative">
            <img
              ref={imageRef}
              src={imageUrl}
              alt={alt || 'Imagen ampliada'}
              className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                cursor: 'default'
              }}
              draggable={false}
            />
            
            {/* Canvas para dibujo - siempre presente */}
            <canvas
              ref={canvasRef}
              className="absolute pointer-events-auto"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center',
                cursor: drawingMode ? (drawingMode === 'pen' ? 'crosshair' : drawingMode === 'highlighter' ? 'cell' : 'grab') : 
                       zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        </div>
        
        {/* Caption */}
        {caption && (
          <div className="p-3 bg-black/50 rounded-b-lg">
            <p className="text-white text-sm text-center italic">
              {caption}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};