# ✅ Implementación Completada: Alerta de Metas Pendientes

## 🎯 Objetivo
Mostrar una alerta al entrar a una agrupación (como "Trabajo") indicando el número de metas pendientes por completar.

## 📋 Archivos Creados

### 1. Base de Datos
- **`database/create_group_goals.sql`** - Script SQL para crear la tabla de metas
  - Tabla `app.GroupGoals` con campos: Id, GroupId, Title, Description, Completed, DueDate, CreatedAt, UpdatedAt
  - Índices para optimizar consultas por GroupId y Completed
  - Foreign Key a `app.DatabaseGroups` con CASCADE DELETE

### 2. Backend (API)
- **`server/database.cjs`** - Métodos agregados:
  - `getGroupGoals(groupId)` - Obtener metas de una agrupación
  - `createGroupGoal(groupId, title, description, dueDate)` - Crear meta
  - `updateGroupGoal(goalId, updates)` - Actualizar meta
  - `deleteGroupGoal(goalId)` - Eliminar meta
  - `getPendingGoalsCount(groupId)` - Obtener conteo de metas pendientes

- **`server/test-api.cjs`** - Endpoints agregados:
  - `GET /groups/:groupId/goals` - Listar metas
  - `GET /groups/:groupId/goals/pending-count` - Conteo de pendientes
  - `POST /groups/:groupId/goals` - Crear meta
  - `PUT /goals/:goalId` - Actualizar meta
  - `DELETE /goals/:goalId` - Eliminar meta

### 3. Frontend (React)
- **`src/hooks/useGroupGoals.ts`** - Hook personalizado con React Query:
  - `useGroupGoals(groupId)` - Query para obtener metas
  - `usePendingGoalsCount(groupId)` - Query para conteo de pendientes
  - `useCreateGroupGoal()` - Mutation para crear
  - `useUpdateGroupGoal()` - Mutation para actualizar
  - `useDeleteGroupGoal()` - Mutation para eliminar

## 📝 Archivos Modificados

### 1. `src/components/GroupDetailView.tsx`
**Cambios:**
- ✅ Importado `usePendingGoalsCount` hook
- ✅ Importado componentes `Alert` y `AlertCircle`
- ✅ Agregado estado `showGoalsAlert` para controlar visibilidad
- ✅ Agregado `useEffect` para mostrar alerta cuando hay metas pendientes
- ✅ Agregada alerta visual con:
  - Icono de advertencia
  - Mensaje con número de metas pendientes
  - Botón "Ver metas" que navega a la vista de metas
  - Botón para cerrar la alerta

**Ubicación de la alerta:**
```tsx
{/* Alerta de metas pendientes */}
{showGoalsAlert && !pendingGoalsLoading && pendingGoalsCount > 0 && (
  <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
    <AlertDescription>
      Tienes <strong>{pendingGoalsCount}</strong> meta(s) pendiente(s)...
    </AlertDescription>
  </Alert>
)}
```

### 2. `src/components/GroupGoalsView.tsx`
**Cambios:**
- ✅ Reemplazado estado local por hooks de React Query
- ✅ Integrado con la base de datos para persistencia
- ✅ Agregados indicadores de carga (Loader2)
- ✅ Agregadas notificaciones toast para feedback
- ✅ Manejo de estados de carga en botones
- ✅ Confirmación antes de eliminar metas

**Funcionalidades:**
- Crear metas con título, descripción y fecha límite
- Editar metas existentes
- Marcar metas como completadas/pendientes
- Eliminar metas con confirmación
- Visualización de metas ordenadas (pendientes primero)

## 🎨 Diseño de la Alerta

La alerta aparece en la parte superior de la vista de agrupación con:
- **Color:** Amarillo/ámbar (warning)
- **Icono:** AlertCircle
- **Contenido:** "Tienes X meta(s) pendiente(s) por completar en esta agrupación"
- **Acciones:**
  - Botón "Ver metas" - Navega a la vista de metas
  - Botón "✕" - Cierra la alerta temporalmente

## 🔄 Flujo de Funcionamiento

1. Usuario entra a una agrupación (ej: "Trabajo")
2. `GroupDetailView` se monta y ejecuta `usePendingGoalsCount(groupId)`
3. El hook consulta el endpoint `/groups/:groupId/goals/pending-count`
4. Si hay metas pendientes (count > 0), se muestra la alerta
5. Usuario puede:
   - Hacer clic en "Ver metas" para ir a la vista de metas
   - Cerrar la alerta con el botón "✕"
6. Al crear/completar/eliminar metas, el conteo se actualiza automáticamente

## 📊 Ejemplo de Uso

```typescript
// En GroupDetailView.tsx
const { data: pendingGoalsCount = 0 } = usePendingGoalsCount(group.id);

// La alerta se muestra automáticamente cuando:
// - pendingGoalsCount > 0
// - showGoalsAlert === true
// - !pendingGoalsLoading
```

## 🚀 Para Activar

1. Ejecutar el script SQL: `database/create_group_goals.sql`
2. Reiniciar el servidor API
3. Navegar a una agrupación
4. Crear metas desde "Metas y Objetivos"
5. La alerta aparecerá automáticamente al entrar a la agrupación

## ✨ Características Adicionales

- ✅ Persistencia en base de datos SQL Server
- ✅ Validación de datos en backend
- ✅ Optimización con índices en la tabla
- ✅ React Query para caché y sincronización
- ✅ Invalidación automática de queries al modificar metas
- ✅ Soporte para modo oscuro en la alerta
- ✅ Responsive design
- ✅ Animaciones suaves
