import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExternalLink, Copy, Check } from "lucide-react";

interface NotionSetupProps {
  onComplete: () => void;
}

export const NotionSetup = ({ onComplete }: NotionSetupProps) => {
  const [token, setToken] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText("VITE_NOTION_TOKEN=ntn_tu_token_de_integracion_aqui");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    // En una aplicación real, aquí guardarías el token de forma segura
    // Por ahora, solo mostramos las instrucciones
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Configurar integración con Notion</CardTitle>
          <CardDescription>
            Conecta tu aplicación con Notion para acceder a tus bases de datos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paso 1 */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">1. Crear integración en Notion</h3>
            <p className="text-sm text-muted-foreground">
              Ve a la página de integraciones de Notion y crea una nueva integración.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://www.notion.so/my-integrations" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Notion Integrations
              </a>
            </Button>
          </div>

          {/* Paso 2 */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">2. Configurar permisos</h3>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que tu integración tenga los siguientes permisos:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Leer contenido (Read content)</li>
              <li>Actualizar contenido (Update content)</li>
              <li>Insertar contenido (Insert content)</li>
            </ul>
          </div>

          {/* Paso 3 */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">3. Compartir bases de datos</h3>
            <p className="text-sm text-muted-foreground">
              En cada base de datos que quieras usar, haz clic en "Compartir" y añade tu integración.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">4. Configurar token</h3>
            <p className="text-sm text-muted-foreground">
              Copia tu token de integración y créa un archivo <code className="bg-muted px-1 rounded">.env</code> en la raíz del proyecto:
            </p>
            
            <div className="bg-muted p-3 rounded-md font-mono text-sm relative">
              <code>VITE_NOTION_TOKEN=ntn_tu_token_de_integracion_aqui</code>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-6 w-6 p-0"
                onClick={handleCopyTemplate}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Importante:</strong> Nunca compartas tu token de integración. El archivo .env ya está incluido en .gitignore.
                <br />
                <span className="text-sm text-muted-foreground mt-2 block">
                  El token puede comenzar con <code className="bg-muted px-1 rounded">secret_</code> o <code className="bg-muted px-1 rounded">ntn_</code> dependiendo de tu versión de Notion.
                </span>
              </AlertDescription>
            </Alert>
          </div>

          {/* Paso 5 */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">5. Estructura recomendada para bases de datos</h3>
            <p className="text-sm text-muted-foreground">
              Para que la aplicación funcione correctamente, tus bases de datos de Notion deberían tener estas propiedades:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li><strong>Título:</strong> Propiedad de tipo "Título" (automática)</li>
              <li><strong>Estado:</strong> Propiedad de tipo "Select" con opciones: tocado, verde, solido</li>
              <li><strong>Notas:</strong> Propiedad de tipo "Texto" (opcional)</li>
              <li><strong>Relacionados:</strong> Propiedad de tipo "Multi-select" (opcional)</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              Continuar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};