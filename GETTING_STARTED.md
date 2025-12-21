# Guía de inicio rápido

¡Tu aplicación de flashcards con integración a Notion está lista! 🎉

## ✅ Lo que se ha implementado

### 🔗 Integración completa con Notion
- Conexión automática a tus bases de datos de Notion
- Sincronización de flashcards desde páginas de Notion
- Actualización de estados de conocimiento en tiempo real
- Lectura de contenido completo de las páginas

### 🎯 Funcionalidades principales
- **Estados de conocimiento**: Tocado, Verde, Sólido
- **Repaso inteligente**: Ordenado por "menos visto primero"
- **Estadísticas claras**: Sin gamificación, solo información útil
- **Control total**: Tú decides qué y cuándo repasar

### 🎨 Interfaz profesional
- Diseño sobrio y enfocado en el estudio
- Componentes responsivos con Tailwind CSS
- Navegación intuitiva entre vistas
- Indicadores de estado de conexión

## 🚀 Próximos pasos

### 1. Configurar tu integración con Notion

1. **Crear integración**:
   - Ve a [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
   - Crea una nueva integración
   - Copia el token (comienza con `secret_`)

2. **Configurar variables de entorno**:
   ```bash
   # Crear archivo .env en la raíz del proyecto
   echo "VITE_NOTION_TOKEN=secret_tu_token_aqui" > .env
   ```

3. **Compartir bases de datos**:
   - En cada base de datos de Notion que quieras usar
   - Haz clic en "Share" → Añadir tu integración

### 2. Estructura recomendada para tus bases de datos

Para obtener la mejor experiencia, configura tus bases de datos con estas propiedades:

| Propiedad | Tipo | Descripción | Requerida |
|-----------|------|-------------|-----------|
| **Título** | Title | Título de la flashcard | ✅ Sí |
| **Estado** | Select | Estados: `tocado`, `verde`, `solido` | 🔶 Recomendada |
| **Notas** | Text | Notas personales | 🔶 Opcional |
| **Relacionados** | Multi-select | Conceptos relacionados | 🔶 Opcional |

### 3. Ejecutar la aplicación

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Iniciar servidor de desarrollo
npm run dev

# La aplicación estará disponible en http://localhost:5173
```

## 📖 Cómo usar la aplicación

### Vista principal
1. **Conexión**: Verifica que aparezca "Conectado a Notion"
2. **Bases de datos**: Ve todas tus bases de datos sincronizadas
3. **Estadísticas**: Revisa el estado general de tu conocimiento

### Iniciar repaso
1. **Seleccionar base de datos**: Haz clic en cualquier base de datos
2. **Elegir estados**: Selecciona qué estados quieres repasar (tocado, verde, o ambos)
3. **Repasar**: Las flashcards aparecerán ordenadas por "menos visto primero"

### Durante el repaso
- **Ver contenido**: El contenido completo de la página de Notion
- **Cambiar estado**: Usa las etiquetas para actualizar el estado
- **Añadir notas**: Agrega notas de revisión (se guardan localmente)
- **Navegar**: Usa "Siguiente" o "Cerrar" para controlar el flujo

## 🔧 Personalización

### Modificar estados de conocimiento
Los estados están definidos en `src/types/index.ts`:
```typescript
export type KnowledgeState = 'tocado' | 'verde' | 'solido';
```

### Añadir nuevas propiedades de Notion
Modifica `src/services/notion.ts` para mapear nuevas propiedades de tus bases de datos.

### Personalizar estilos
Los estilos están en Tailwind CSS. Modifica los componentes en `src/components/` para cambiar la apariencia.

## 🐛 Solución de problemas

### "No se pudo conectar con Notion"
- ✅ Verifica que el token esté en `.env`
- ✅ Asegúrate de que el token comience con `secret_`
- ✅ Reinicia el servidor después de añadir el `.env`

### "No se encontraron bases de datos"
- ✅ Comparte las bases de datos con tu integración
- ✅ Verifica que la integración tenga permisos de lectura

### Las flashcards no muestran contenido
- ✅ Asegúrate de que las páginas tengan contenido en el cuerpo
- ✅ Verifica que la integración tenga permisos de lectura de contenido

## 📚 Recursos adicionales

- **[NOTION_SETUP.md](./NOTION_SETUP.md)**: Guía detallada de configuración
- **[README.md](./README.md)**: Documentación completa del proyecto
- **Notion API**: [https://developers.notion.com/](https://developers.notion.com/)

## 🎯 Filosofía de la aplicación

Esta aplicación está diseñada para:
- **Gestión consciente del conocimiento** (no memorización mecánica)
- **Control total del usuario** (sin automatización forzada)
- **Claridad visual** (sin distracciones ni gamificación)
- **Estudio profundo** (enfoque en comprensión, no velocidad)

¡Disfruta gestionando tu conocimiento de manera consciente y efectiva! 🧠✨