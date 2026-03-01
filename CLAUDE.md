# CLAUDE.md — Mindful Study

## Propósito
App de estudio basada en flashcards conectadas a Notion. Sin gamificación. Gestión consciente del conocimiento.

## Cómo correr
```bash
npm run dev:full      # Frontend (:8082) + API (:3002) juntos
npm run dev           # Solo frontend (Vite)
npm run dev:api       # Solo API (Express)
```

## Arquitectura
Dos procesos independientes:
- **Frontend**: React + TypeScript + Vite → `src/`
- **API server**: Express (CommonJS) → `server/test-api.cjs` (único archivo, ~3100 líneas)

**IMPORTANTE**: El servidor usa `.cjs` (CommonJS: `require/module.exports`). El frontend usa ESM (`import/export`). No mezclar.

## Fuentes de datos
| Qué | Dónde |
|-----|-------|
| Flashcards, contenido, estados (tocado/verde/sólido) | **Notion API** (`@notionhq/client`) |
| Groups, folders, planning sessions, exams, stats, notes, goals | **SQL Server** (`mssql`) vía `server/database.cjs` |

Variables de entorno clave (`.env`):
- `VITE_NOTION_TOKEN` — token de integración Notion
- `DB_SERVER`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD` — SQL Server

## Estructura clave
```
src/
├── hooks/          # useNotion, usePlanning, useExams, useGroups, useGroupFolders...
├── components/     # Un componente por feature (ExamMode, FlashcardReview, GroupDetailView...)
├── pages/          # Index.tsx (única página con routing interno por estado)
├── types/          # index.ts — todos los tipos centralizados
server/
├── test-api.cjs    # TODA la API REST (Express). Endpoints por dominio:
│                   #   /databases, /flashcards, /groups, /group-folders,
│                   #   /planning-sessions, /session-folders, /exams, /study-stats,
│                   #   /reference-points, /global-notes, /user/settings
├── database.cjs    # Pool SQL Server + DatabaseService (métodos por tabla)
database/
└── *.sql           # Migraciones manuales (no hay ORM ni migrador automático)
```

## Git
- **Nunca hacer commit ni push** a menos que el usuario lo pida explícitamente.

## Reglas de conducta
- Antes de recomendar herramientas, servicios o librerías externas, listar **todos** los requisitos (costos, prerrequisitos, limitaciones) antes de que el usuario tome cualquier acción.
- No dar recomendaciones incompletas. Si no se tienen claros todos los requisitos de una opción, investigarlos primero antes de sugerirla.
- Si hay varias opciones, decir explícitamente cuál es la recomendada y por qué, en lugar de listar alternativas sin criterio claro.

## Convenciones del proyecto
- Las migraciones SQL se aplican **manualmente** en SQL Server Management Studio.
- El archivo `server/test-api.cjs` crece con cada feature — no dividir en múltiples archivos sin consenso.
- Los tipos van todos en `src/types/index.ts`.
- `TanStack Query` maneja cache/fetching en el frontend; los hooks en `src/hooks/` encapsulan los fetch calls.
- Branch actual de trabajo: `perf/server-notion-query-optimization`. Main branch: `main`.

## Features principales
- Flashcard review con estados de conocimiento
- Groups y GroupFolders para organizar bases de datos de Notion
- Planning sessions con SessionFolders
- Exams (generación y corrección)
- Reference points por flashcard
- Study tracking / stats / streak
- Review notes por flashcard
- Configuración de usuario + notificaciones por email
