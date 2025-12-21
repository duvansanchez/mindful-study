# Flashcards Study App - Knowledge Base Manager

Una aplicación web de estudio basada en flashcards conectadas a bases de datos de Notion. Diseñada para gestión consciente del conocimiento, sin gamificación.

## 🎯 Características principales

- **Conexión con Notion**: Sincroniza tus bases de datos de Notion como flashcards
- **Estados de conocimiento**: Tocado, Verde, Sólido (sin puntuaciones ni gamificación)
- **Repaso inteligente**: Orden por "menos visto primero"
- **Estadísticas claras**: Visualiza el estado de tu conocimiento sin ruido
- **Control total**: Tú decides qué y cuándo repasar

## 🚀 Inicio rápido

### Requisitos previos

- Node.js & npm instalados - [instalar con nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- Una cuenta de Notion con bases de datos configuradas

### Instalación

```sh
# 1. Clonar el repositorio
git clone <YOUR_GIT_URL>

# 2. Navegar al directorio del proyecto
cd <YOUR_PROJECT_NAME>

# 3. Instalar dependencias
npm install

# 4. Configurar variables de entorno
cp .env.example .env
# Edita .env y añade tu token de Notion

# 5. Iniciar el servidor de desarrollo
npm run dev
```

## 🔧 Configuración de Notion

Para conectar la aplicación con Notion, sigue estos pasos:

1. **Crear una integración en Notion**
   - Ve a [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Crea una nueva integración con permisos de lectura y escritura

2. **Configurar el token**
   - Copia el token de integración (comienza con `secret_`)
   - Añádelo al archivo `.env`:
     ```
     VITE_NOTION_TOKEN=secret_tu_token_aqui
     ```

3. **Compartir bases de datos**
   - En cada base de datos de Notion que quieras usar
   - Haz clic en "Share" y añade tu integración

4. **Estructura recomendada**
   - **Título** (Title): Título de la flashcard
   - **Estado** (Select): tocado, verde, solido
   - **Notas** (Text): Notas personales
   - **Relacionados** (Multi-select): Conceptos relacionados

📖 **Guía completa**: Ver [NOTION_SETUP.md](./NOTION_SETUP.md) para instrucciones detalladas

## 🛠️ Tecnologías utilizadas

- **Vite** - Build tool y dev server
- **React** - Framework UI
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes UI
- **TanStack Query** - Gestión de estado y cache
- **Notion API** - Integración con Notion

## 📁 Estructura del proyecto

```
src/
├── components/       # Componentes React
│   ├── ui/          # Componentes base de shadcn/ui
│   ├── DatabaseCard.tsx
│   ├── FlashcardReview.tsx
│   └── ...
├── hooks/           # Custom hooks
│   └── useNotion.ts # Hooks para Notion API
├── services/        # Servicios externos
│   └── notion.ts    # Cliente de Notion API
├── types/           # Definiciones de tipos TypeScript
├── pages/           # Páginas de la aplicación
└── data/            # Datos mock (para desarrollo)
```

## 🎨 Filosofía de diseño

Esta aplicación está diseñada con los siguientes principios:

- **Sin gamificación**: No hay puntos, streaks ni premios
- **Control del usuario**: Tú decides qué y cuándo repasar
- **Claridad visual**: Diseño sobrio y profesional
- **Gestión consciente**: Enfoque en conocimiento profundo, no memorización

## 📝 Scripts disponibles

```sh
npm run dev          # Servidor de desarrollo
npm run build        # Build para producción
npm run build:dev    # Build en modo desarrollo
npm run lint         # Ejecutar linter
npm run preview      # Preview de la build
```

## 🚢 Despliegue

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## 🌐 Dominio personalizado

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## 🤝 Contribuir

Este proyecto está en desarrollo activo. Las contribuciones son bienvenidas.

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.
