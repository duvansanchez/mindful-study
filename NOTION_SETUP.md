# Configuración de Notion

Esta guía te ayudará a conectar tu aplicación de flashcards con Notion.

## Pasos para configurar la integración

### 1. Crear una integración en Notion

1. Ve a [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Haz clic en "New integration"
3. Dale un nombre a tu integración (ej: "Flashcards App")
4. Selecciona el workspace donde están tus bases de datos
5. Configura los permisos necesarios:
   - ✅ Read content
   - ✅ Update content
   - ✅ Insert content

### 2. Obtener el token de integración

1. Una vez creada la integración, copia el "Internal Integration Token"
2. Este token comenzará con `secret_`

### 3. Configurar variables de entorno

1. En la raíz de tu proyecto, crea un archivo `.env`
2. Añade tu token:
   ```
   VITE_NOTION_TOKEN=secret_tu_token_aqui
   ```

### 4. Compartir bases de datos con la integración

Para cada base de datos que quieras usar:

1. Abre la base de datos en Notion
2. Haz clic en "Share" (Compartir) en la esquina superior derecha
3. Busca tu integración por nombre y añádela
4. Asegúrate de que tenga permisos de "Can edit"

### 5. Estructura recomendada para bases de datos

Para que la aplicación funcione correctamente, tus bases de datos deberían tener estas propiedades:

#### Propiedades obligatorias:
- **Título** (Title): Se crea automáticamente, será el título de la flashcard

#### Propiedades opcionales pero recomendadas:
- **Estado** (Select): Para el estado de conocimiento
  - Opciones: `tocado`, `verde`, `solido`
- **Notas** (Text): Para notas personales
- **Relacionados** (Multi-select): Para conceptos relacionados

#### Ejemplo de estructura:

| Propiedad | Tipo | Opciones |
|-----------|------|----------|
| Título | Title | - |
| Estado | Select | tocado, verde, solido |
| Notas | Text | - |
| Relacionados | Multi-select | - |

### 6. Contenido de las páginas

El contenido principal de cada flashcard se obtiene del cuerpo de la página en Notion. Puedes usar:

- Texto normal
- Encabezados (H1, H2, H3)
- Listas con viñetas
- Listas numeradas
- Código
- Citas

### Solución de problemas

#### Error: "No se pudo conectar con Notion"
- Verifica que el token esté correctamente configurado en `.env`
- Asegúrate de que el token comience con `secret_`
- Reinicia el servidor de desarrollo después de añadir el `.env`

#### Error: "No se encontraron bases de datos"
- Verifica que hayas compartido las bases de datos con tu integración
- Asegúrate de que la integración tenga permisos de lectura

#### Las flashcards no muestran contenido
- Verifica que las páginas de la base de datos tengan contenido en el cuerpo
- Asegúrate de que la integración tenga permisos de lectura de contenido

### Limitaciones actuales

- Los cambios de estado se sincronizan con Notion, pero las notas de revisión se almacenan localmente
- El conteo de visualizaciones se maneja localmente
- La fecha de última revisión no se sincroniza automáticamente con Notion

### Próximas mejoras

- Sincronización bidireccional completa
- Soporte para más tipos de propiedades de Notion
- Cache inteligente para mejor rendimiento
- Soporte para relaciones entre bases de datos