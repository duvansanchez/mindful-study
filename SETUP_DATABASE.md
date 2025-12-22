# Configuración de Base de Datos - MindfulStudy

Esta guía te ayudará a configurar la base de datos local para las funcionalidades avanzadas de MindfulStudy (agrupaciones, estadísticas, notas personalizadas).

## 📋 Requisitos Previos

### 1. SQL Server
Necesitas una de estas opciones:
- **SQL Server Express** (gratuito) - Recomendado para desarrollo
- **SQL Server Developer Edition** (gratuito)
- **SQL Server Standard/Enterprise**
- **Azure SQL Database**

### 2. Herramientas de Administración
- **SQL Server Management Studio (SSMS)** - Recomendado
- **Azure Data Studio** - Alternativa moderna
- **Visual Studio Code** con extensión SQL Server

## 🚀 Instalación Rápida

### Opción 1: Script Automático (Recomendado)

1. **Configurar variables de entorno**
   ```bash
   # Copiar archivo de ejemplo
   cp .env.example .env
   
   # Editar .env con la configuración de tu servidor
   DB_SERVER=DESKTOP-2MR0PJ6
   DB_DATABASE=MindfulStudy
   # Para Windows Authentication (recomendado):
   DB_USER=
   DB_PASSWORD=
   # O para SQL Authentication:
   # DB_USER=tu_usuario
   # DB_PASSWORD=tu_password
   DB_ENCRYPT=false
   DB_TRUST_SERVER_CERTIFICATE=true
   ```

2. **Ejecutar script de configuración**
   ```bash
   npm run setup:db
   ```

3. **¡Listo!** La base de datos está configurada.

### Opción 2: Configuración Manual

1. **Abrir SQL Server Management Studio**

2. **Ejecutar scripts en orden:**
   ```sql
   -- 1. Crear base de datos
   -- Ejecutar: database/create_database.sql
   
   -- 2. Crear tablas
   -- Ejecutar: database/create_tables.sql
   
   -- 3. Datos iniciales (opcional)
   -- Ejecutar: database/seed_data.sql
   ```

3. **Configurar .env** (igual que opción 1)

## 🔧 Configuración de SQL Server Express

Si no tienes SQL Server instalado:

### Windows
1. Descargar [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Instalar con configuración por defecto
3. Descargar [SSMS](https://docs.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
4. Conectar usando:
   - **Servidor**: `DESKTOP-2MR0PJ6` (tu servidor local)
   - **Autenticación**: Windows Authentication (recomendado)

### macOS/Linux
1. Usar Docker:
   ```bash
   docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" \
   -p 1433:1433 --name sqlserver \
   -d mcr.microsoft.com/mssql/server:2019-latest
   ```
2. Conectar usando:
   - **Servidor**: `localhost`
   - **Usuario**: `sa`
   - **Password**: `YourPassword123!`

## 🧪 Verificar Instalación

1. **Reiniciar el servidor**
   ```bash
   npm run dev:notion
   ```

2. **Buscar en los logs:**
   ```
   ✅ Conexión a SQL Server establecida
   🗄️ Base de datos inicializada correctamente
   ```

3. **Probar funcionalidad:**
   - Ir a la app web
   - Hacer clic en "Nueva agrupación"
   - Debería aparecer un formulario

## 📊 Funcionalidades Habilitadas

Con la base de datos configurada tendrás acceso a:

### ✅ Agrupaciones Personalizadas
- Crear grupos temáticos de bases de datos
- Asignar colores personalizados
- Ver estadísticas por grupo

### ✅ Notas de Repaso
- Agregar notas personalizadas durante el estudio
- Historial de notas por flashcard
- Búsqueda y filtrado

### ✅ Estadísticas Avanzadas
- Tracking de tiempo de estudio
- Historial de cambios de estado
- Métricas de rendimiento

### ✅ Configuraciones Personalizadas
- Preferencias de usuario
- Configuraciones por defecto
- Temas y personalización

## 🔍 Troubleshooting

### Error: "Cannot connect to SQL Server"
```bash
# Verificar que SQL Server esté ejecutándose
# Windows: Services.msc -> SQL Server (SQLEXPRESS)
# Docker: docker ps

# Verificar credenciales en .env
# Probar conexión con SSMS primero
```

### Error: "Login failed for user"
```bash
# Opción 1: Usar Windows Authentication
DB_USER=
DB_PASSWORD=
# (dejar vacío para Windows Auth)

# Opción 2: Habilitar SQL Server Authentication
# En SSMS: Server Properties -> Security -> SQL Server and Windows Authentication mode
```

### Error: "Database does not exist"
```bash
# Ejecutar manualmente create_database.sql
# O usar el script automático:
npm run setup:db
```

### La app funciona pero no aparece "Nueva agrupación"
```bash
# Verificar logs del servidor
# Debe mostrar: "Base de datos inicializada correctamente"
# Si no, revisar configuración de .env
```

## 📚 Estructura de la Base de Datos

```
MindfulStudy/
├── app.DatabaseGroups          # Agrupaciones personalizadas
├── app.DatabaseGroupMappings   # Relación grupos-bases de datos
├── app.UserSettings            # Configuraciones de usuario
├── app.StudyStats              # Estadísticas de estudio
└── app.ReviewNotes             # Notas personalizadas
```

## 🆘 Soporte

Si tienes problemas:

1. **Revisar logs del servidor** - Buscar mensajes de error
2. **Verificar conexión** - Probar con SSMS/Azure Data Studio
3. **Ejecutar scripts manualmente** - Si el automático falla
4. **Usar modo sin BD** - La app funciona sin base de datos (solo Notion)

## 🎯 Próximos Pasos

Una vez configurada la base de datos:

1. **Crear tu primera agrupación** - Organiza tus bases de datos
2. **Explorar estadísticas** - Ve tu progreso de estudio
3. **Agregar notas** - Personaliza tu experiencia de repaso
4. **Configurar preferencias** - Ajusta la app a tu gusto

¡Disfruta estudiando con MindfulStudy! 🚀