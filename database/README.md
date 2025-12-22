# Base de Datos MindfulStudy

Esta carpeta contiene los scripts SQL para configurar la base de datos local de MindfulStudy.

## Requisitos

- SQL Server 2019 o superior (o SQL Server Express)
- SQL Server Management Studio (SSMS) o Azure Data Studio

## Instalación

### 1. Ejecutar scripts en orden:

```sql
-- 1. Crear la base de datos
-- Ejecutar: database/create_database.sql

-- 2. Crear las tablas
-- Ejecutar: database/create_tables.sql

-- 3. Insertar datos iniciales (opcional)
-- Ejecutar: database/seed_data.sql
```

### 2. Configurar conexión

Crear archivo `.env.local` en la raíz del proyecto:

```env
# Base de datos local
DB_SERVER=localhost
DB_DATABASE=MindfulStudy
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

## Estructura de la Base de Datos

### Tablas Principales

#### `app.DatabaseGroups`
Almacena las agrupaciones personalizadas de bases de datos de Notion.
- `Id`: Identificador único
- `Name`: Nombre de la agrupación
- `Color`: Color en formato hex (#RRGGBB)
- `CreatedAt`, `UpdatedAt`: Timestamps
- `IsActive`: Estado activo/inactivo

#### `app.DatabaseGroupMappings`
Relaciona bases de datos de Notion con agrupaciones.
- `GroupId`: Referencia a DatabaseGroups
- `NotionDatabaseId`: ID de la base de datos en Notion
- `NotionDatabaseName`: Nombre para referencia

#### `app.UserSettings`
Configuraciones personalizables de la aplicación.
- `SettingKey`: Clave única de configuración
- `SettingValue`: Valor de la configuración
- `SettingType`: Tipo de dato (string, number, boolean, json)

#### `app.StudyStats`
Estadísticas y métricas de estudio.
- `NotionDatabaseId`, `FlashcardId`: Identificadores
- `StatType`: Tipo de evento (view, review, state_change)
- `StatValue`: Valor del evento
- `SessionId`: Agrupación por sesión

#### `app.ReviewNotes`
Notas personalizadas durante el repaso.
- `FlashcardId`: ID de la flashcard
- `NoteContent`: Contenido de la nota
- `SessionId`: Sesión de repaso

## Funcionalidades

### Agrupaciones Personalizadas
- Crear grupos temáticos de bases de datos
- Asignar colores personalizados
- Ver estadísticas por grupo

### Estadísticas de Estudio
- Tracking de visualizaciones
- Historial de cambios de estado
- Métricas por sesión

### Configuraciones
- Personalización de la experiencia
- Configuraciones por usuario
- Valores por defecto

## Mantenimiento

### Backup
```sql
BACKUP DATABASE MindfulStudy 
TO DISK = 'C:\Backup\MindfulStudy.bak'
```

### Limpiar datos antiguos
```sql
-- Eliminar estadísticas de más de 6 meses
DELETE FROM app.StudyStats 
WHERE Timestamp < DATEADD(MONTH, -6, GETUTCDATE());
```

## Troubleshooting

### Error de conexión
1. Verificar que SQL Server esté ejecutándose
2. Confirmar credenciales en `.env.local`
3. Verificar firewall y puertos (1433 por defecto)

### Permisos
El usuario debe tener permisos de:
- `db_datareader`
- `db_datawriter` 
- `db_ddladmin` (para crear tablas)