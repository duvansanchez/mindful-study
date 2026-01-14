# Instrucciones para Implementar Metas de Agrupaciones

## Pasos para activar la funcionalidad

### 1. Crear la tabla de metas en la base de datos

Ejecuta el siguiente script SQL en tu SQL Server Management Studio o con sqlcmd:

```bash
sqlcmd -S localhost -U sa -P 123 -d MindfulStudy -i database/create_group_goals.sql
```

O abre el archivo `database/create_group_goals.sql` y ejecútalo manualmente en SQL Server Management Studio.

### 2. Reiniciar el servidor API

Si el servidor está corriendo, reinícialo para que cargue los nuevos endpoints:

```bash
# Detener el servidor actual (Ctrl+C)
# Luego iniciar de nuevo
node server/test-api.cjs
```

### 3. Probar la funcionalidad

1. Abre la aplicación en el navegador
2. Navega a una agrupación (por ejemplo, "Trabajo")
3. Verás una alerta amarilla indicando el número de metas pendientes (si hay alguna)
4. Haz clic en "Metas y Objetivos" para crear nuevas metas
5. Las metas creadas se guardarán en la base de datos
6. Al volver a entrar a la agrupación, verás la alerta con el conteo actualizado

## Características implementadas

✅ Tabla de base de datos para almacenar metas (`app.GroupGoals`)
✅ Endpoints API para CRUD de metas
✅ Hook de React Query para consultar metas (`useGroupGoals`)
✅ Hook para obtener conteo de metas pendientes (`usePendingGoalsCount`)
✅ Alerta en `GroupDetailView` mostrando metas pendientes
✅ Componente `GroupGoalsView` actualizado para usar la base de datos
✅ Persistencia completa de metas (crear, editar, eliminar, completar)

## Estructura de la tabla GroupGoals

- `Id`: UNIQUEIDENTIFIER (Primary Key)
- `GroupId`: UNIQUEIDENTIFIER (Foreign Key a DatabaseGroups)
- `Title`: NVARCHAR(500) - Título de la meta
- `Description`: NVARCHAR(MAX) - Descripción opcional
- `Completed`: BIT - Estado de completado (0 = pendiente, 1 = completada)
- `DueDate`: DATE - Fecha límite opcional
- `CreatedAt`: DATETIME2 - Fecha de creación
- `UpdatedAt`: DATETIME2 - Fecha de última actualización

## Endpoints API disponibles

- `GET /groups/:groupId/goals` - Obtener todas las metas de una agrupación
- `GET /groups/:groupId/goals/pending-count` - Obtener conteo de metas pendientes
- `POST /groups/:groupId/goals` - Crear nueva meta
- `PUT /goals/:goalId` - Actualizar meta existente
- `DELETE /goals/:goalId` - Eliminar meta
