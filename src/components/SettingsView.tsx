import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Eye, EyeOff, Save, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const API_BASE = '/api';

interface NotionIntegration {
  id: string;
  name: string;
  token: string;
  isEnabled: boolean;
  createdAt: string;
}

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const [integrations, setIntegrations] = useState<NotionIntegration[]>([]);
  const [showTokens, setShowTokens] = useState<Set<string>>(new Set());
  const [editingIntegration, setEditingIntegration] = useState<string | null>(null);
  const [newIntegration, setNewIntegration] = useState({ name: '', token: '' });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Cargar email de notificaciones del servidor
  useEffect(() => {
    fetch(`${API_BASE}/user/settings`)
      .then(r => r.ok ? r.json() : {})
      .then(s => { if (s.notificationEmail) setNotificationEmail(s.notificationEmail); })
      .catch(() => {});
  }, []);

  const handleSaveEmail = async () => {
    setSavingEmail(true);
    try {
      await fetch(`${API_BASE}/user/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationEmail }),
      });
      toast.success('Email de notificaciones guardado');
    } catch {
      toast.error('Error guardando el email');
    } finally {
      setSavingEmail(false);
    }
  };

  // Cargar integraciones del localStorage
  useEffect(() => {
    const savedIntegrations = localStorage.getItem('notion-integrations');
    if (savedIntegrations) {
      try {
        const parsed = JSON.parse(savedIntegrations);
        setIntegrations(parsed);
      } catch (error) {
        console.error('Error parsing saved integrations:', error);
      }
    } else {
      // Si no hay integraciones guardadas, crear una por defecto con el token actual
      const currentToken = import.meta.env.VITE_NOTION_TOKEN;
      if (currentToken) {
        const defaultIntegration: NotionIntegration = {
          id: 'default',
          name: 'Integración Principal',
          token: currentToken,
          isEnabled: true,
          createdAt: new Date().toISOString()
        };
        setIntegrations([defaultIntegration]);
        saveIntegrations([defaultIntegration]);
      }
    }
  }, []);

  const saveIntegrations = (integrationsToSave: NotionIntegration[]) => {
    localStorage.setItem('notion-integrations', JSON.stringify(integrationsToSave));
  };

  const handleAddIntegration = () => {
    if (!newIntegration.name.trim() || !newIntegration.token.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    const integration: NotionIntegration = {
      id: Date.now().toString(),
      name: newIntegration.name.trim(),
      token: newIntegration.token.trim(),
      isEnabled: true,
      createdAt: new Date().toISOString()
    };

    const updatedIntegrations = [...integrations, integration];
    setIntegrations(updatedIntegrations);
    saveIntegrations(updatedIntegrations);
    
    setNewIntegration({ name: '', token: '' });
    setIsAddingNew(false);
  };

  const handleDeleteIntegration = (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta integración?')) {
      const updatedIntegrations = integrations.filter(i => i.id !== id);
      setIntegrations(updatedIntegrations);
      saveIntegrations(updatedIntegrations);
    }
  };

  const handleToggleEnabled = (id: string) => {
    const updatedIntegrations = integrations.map(integration => ({
      ...integration,
      isEnabled: integration.id === id ? !integration.isEnabled : integration.isEnabled
    }));
    setIntegrations(updatedIntegrations);
    saveIntegrations(updatedIntegrations);
  };

  const handleUpdateIntegration = (id: string, updates: Partial<NotionIntegration>) => {
    const updatedIntegrations = integrations.map(integration =>
      integration.id === id ? { ...integration, ...updates } : integration
    );
    setIntegrations(updatedIntegrations);
    saveIntegrations(updatedIntegrations);
    setEditingIntegration(null);
  };

  const toggleShowToken = (id: string) => {
    const newShowTokens = new Set(showTokens);
    if (newShowTokens.has(id)) {
      newShowTokens.delete(id);
    } else {
      newShowTokens.add(id);
    }
    setShowTokens(newShowTokens);
  };

  const maskToken = (token: string) => {
    if (token.length <= 8) return token;
    return token.substring(0, 4) + '•'.repeat(token.length - 8) + token.substring(token.length - 4);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configuración</h1>
            <p className="text-muted-foreground">Gestiona tus integraciones de Notion</p>
          </div>
        </div>
        <Button onClick={onBack} variant="outline">
          <X className="w-4 h-4 mr-2" />
          Cerrar
        </Button>
      </div>

      {/* Integraciones de Notion */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Integraciones de Notion</CardTitle>
              <CardDescription>
                Configura múltiples tokens de Notion para organizar tus bases de datos
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsAddingNew(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Integración
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Formulario para nueva integración */}
          {isAddingNew && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="new-name">Nombre de la integración</Label>
                    <Input
                      id="new-name"
                      placeholder="ej. Estudios Universidad, Trabajo, Personal..."
                      value={newIntegration.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIntegration(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-token">Token de Notion</Label>
                    <Input
                      id="new-token"
                      type="password"
                      placeholder="secret_..."
                      value={newIntegration.token}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIntegration(prev => ({ ...prev, token: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddIntegration}>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddingNew(false);
                        setNewIntegration({ name: '', token: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de integraciones */}
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay integraciones configuradas</p>
              <p className="text-sm">Agrega tu primera integración de Notion</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <Card key={integration.id} className={`${integration.isEnabled ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10' : 'border-muted bg-muted/30'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        {editingIntegration === integration.id ? (
                          <div className="space-y-3">
                            <Input
                              value={integration.name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const updatedIntegrations = integrations.map(i =>
                                  i.id === integration.id ? { ...i, name: e.target.value } : i
                                );
                                setIntegrations(updatedIntegrations);
                              }}
                              placeholder="Nombre de la integración"
                            />
                            <div className="flex gap-2">
                              <Button 
                                size="sm"
                                onClick={() => handleUpdateIntegration(integration.id, { name: integration.name })}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                Guardar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setEditingIntegration(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium">{integration.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                integration.isEnabled 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {integration.isEnabled ? 'Habilitada' : 'Deshabilitada'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Token:</span>
                              <code className="bg-muted px-2 py-1 rounded text-xs">
                                {showTokens.has(integration.id) ? integration.token : maskToken(integration.token)}
                              </code>
                              <button
                                onClick={() => toggleShowToken(integration.id)}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {showTokens.has(integration.id) ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Creada: {new Date(integration.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant={integration.isEnabled ? "destructive" : "default"}
                          onClick={() => handleToggleEnabled(integration.id)}
                        >
                          {integration.isEnabled ? 'Deshabilitar' : 'Habilitar'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingIntegration(integration.id)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteIntegration(integration.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notificaciones por email */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-orange-500" />
            <div>
              <CardTitle>Notificaciones de estudio</CardTitle>
              <CardDescription>
                Recibe un correo el día que tengas sesiones de repaso programadas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notificationEmail">Email para notificaciones</Label>
            <div className="flex gap-2">
              <Input
                id="notificationEmail"
                type="email"
                placeholder="tu@email.com"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
              />
              <Button onClick={handleSaveEmail} disabled={savingEmail || !notificationEmail.trim()}>
                <Save className="w-4 h-4 mr-2" />
                {savingEmail ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Requiere configurar <code className="bg-muted px-1 rounded">SMTP_HOST</code>, <code className="bg-muted px-1 rounded">SMTP_USER</code> y <code className="bg-muted px-1 rounded">SMTP_PASS</code> en el archivo <code className="bg-muted px-1 rounded">.env</code> del servidor.
          </p>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>• Puedes tener múltiples integraciones de Notion habilitadas simultáneamente</p>
          <p>• Cada integración puede acceder a diferentes conjuntos de bases de datos</p>
          <p>• Puedes habilitar/deshabilitar integraciones según necesites</p>
          <p>• Los tokens se almacenan localmente en tu navegador de forma segura</p>
        </CardContent>
      </Card>
    </div>
  );
};