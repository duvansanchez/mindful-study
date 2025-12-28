import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
  label?: string;
}

// Paleta de colores expandida con más opciones organizadas por categorías
const colorPalette = [
  // Azules
  { name: 'Azul Claro', value: '#3B82F6', category: 'azul' },
  { name: 'Azul Oscuro', value: '#1E40AF', category: 'azul' },
  { name: 'Azul Cielo', value: '#0EA5E9', category: 'azul' },
  { name: 'Índigo', value: '#6366F1', category: 'azul' },
  
  // Verdes
  { name: 'Verde', value: '#10B981', category: 'verde' },
  { name: 'Verde Esmeralda', value: '#059669', category: 'verde' },
  { name: 'Verde Lima', value: '#65A30D', category: 'verde' },
  { name: 'Teal', value: '#14B8A6', category: 'verde' },
  
  // Púrpuras y Violetas
  { name: 'Púrpura', value: '#8B5CF6', category: 'purpura' },
  { name: 'Violeta', value: '#7C3AED', category: 'purpura' },
  { name: 'Fucsia', value: '#C026D3', category: 'purpura' },
  { name: 'Magenta', value: '#DB2777', category: 'purpura' },
  
  // Rojos y Rosas
  { name: 'Rojo', value: '#EF4444', category: 'rojo' },
  { name: 'Rosa', value: '#EC4899', category: 'rojo' },
  { name: 'Rojo Oscuro', value: '#DC2626', category: 'rojo' },
  { name: 'Rosa Claro', value: '#F472B6', category: 'rojo' },
  
  // Naranjas y Amarillos
  { name: 'Naranja', value: '#F59E0B', category: 'naranja' },
  { name: 'Amarillo', value: '#EAB308', category: 'naranja' },
  { name: 'Ámbar', value: '#D97706', category: 'naranja' },
  { name: 'Naranja Rojizo', value: '#EA580C', category: 'naranja' },
  
  // Grises y Neutros
  { name: 'Gris', value: '#6B7280', category: 'gris' },
  { name: 'Gris Oscuro', value: '#374151', category: 'gris' },
  { name: 'Pizarra', value: '#475569', category: 'gris' },
  { name: 'Zinc', value: '#52525B', category: 'gris' },
  
  // Colores especiales
  { name: 'Cian', value: '#06B6D4', category: 'especial' },
  { name: 'Turquesa', value: '#0891B2', category: 'especial' },
  { name: 'Lavanda', value: '#A855F7', category: 'especial' },
  { name: 'Coral', value: '#FB7185', category: 'especial' },
];

export function ColorPicker({ selectedColor, onColorChange, label = "Color" }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(selectedColor);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    onColorChange(color);
  };

  const handleCustomColorSubmit = () => {
    if (customColor && /^#[0-9A-F]{6}$/i.test(customColor)) {
      onColorChange(customColor);
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* Paleta de colores predefinidos */}
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">Colores predefinidos</div>
        <div className="grid grid-cols-8 gap-2">
          {colorPalette.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onColorChange(color.value)}
              className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-105 relative shadow-sm ${
                selectedColor === color.value
                  ? 'border-foreground scale-110 shadow-md ring-2 ring-primary/20'
                  : 'border-border hover:border-foreground/50'
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {selectedColor === color.value && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selector de color personalizado */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="text-sm text-muted-foreground">Color personalizado</div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-2 h-9"
              >
                <Palette className="w-4 h-4" />
                Personalizar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Selector de color personalizado</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Elige cualquier color usando el selector o ingresa un código hexadecimal
                  </p>
                </div>
                
                {/* Color picker nativo del navegador */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="w-16 h-10 rounded-md border border-border cursor-pointer bg-transparent"
                  />
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      placeholder="#FF5733"
                      className="font-mono text-sm"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>
                
                {/* Vista previa */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <div
                    className="w-10 h-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: customColor }}
                  />
                  <div>
                    <div className="text-sm font-medium">Vista previa</div>
                    <div className="text-xs text-muted-foreground font-mono">{customColor}</div>
                  </div>
                </div>
                
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCustomColorSubmit}
                  disabled={!customColor || !/^#[0-9A-F]{6}$/i.test(customColor)}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Aplicar color personalizado
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Mostrar color actual */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/50 text-sm">
            <div
              className="w-4 h-4 rounded border border-border shadow-sm"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="font-mono text-xs">{selectedColor}</span>
          </div>
        </div>
      </div>
    </div>
  );
}