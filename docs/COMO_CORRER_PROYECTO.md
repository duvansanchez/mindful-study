# Cómo correr el proyecto (rápido)

## Ruta del proyecto
- `C:/Repositorios/mindful-study`

## Requisitos
- Node.js 18+
- npm
- SQL Server (si usarás datos locales de planificación/metas)

## 1) Instalar dependencias
En la raíz del proyecto:

```bash
npm install
```

## 2) Configurar variables de entorno
Archivo: `.env`

Mínimo para arrancar:
- `VITE_NOTION_TOKEN=...`

Si usarás funcionalidades con SQL Server, también:
- `DB_SERVER=...`
- `DB_DATABASE=...`
- `DB_USER=...`
- `DB_PASSWORD=...`
- `DB_ENCRYPT=true`
- `DB_TRUST_SERVER_CERTIFICATE=true`

## 3) Levantar frontend + API juntos (recomendado)

```bash
npm run dev:full
```

Esto levanta:
- API: `http://localhost:3002`
- Frontend (Vite): `http://localhost:8082`

## Comandos útiles (por separado)
Solo API:

```bash
npm run dev:api
```

Solo frontend:

```bash
npm run dev
```

## Build de producción

```bash
npm run build
```

## Actualizaciones de Base de Datos

### Agregar Notas Globales para el Módulo "Información general agrupaciones"

Si ya tienes la base de datos creada, ejecuta este script para agregar la funcionalidad de notas globales:

```sql
-- En SQL Server Management Studio, ejecuta:
USE MindfulStudy;
GO

-- Ejecutar el script:
-- database/add_global_notes.sql
```

O ejecuta directamente desde la línea de comandos (si tienes `sqlcmd` instalado):

```bash
sqlcmd -S YOUR_SERVER -U YOUR_USER -P YOUR_PASSWORD -d MindfulStudy -i database/add_global_notes.sql
```

## Si ves `ERR_CONNECTION_REFUSED`
Revisa que ambos puertos estén arriba:
- `http://localhost:8082`
- `http://localhost:3002/test`

Si no responden, vuelve a correr:

```bash
npm run dev:full
```
