const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');
const { initializeDatabase, DatabaseService } = require('./database.cjs');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
// Aumentar límite de payload para imágenes base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// TEST: Endpoint al principio del archivo
app.get('/test-at-beginning', (req, res) => {
  console.log('🧪 TEST: Endpoint al principio llamado');
  res.json({ message: 'Endpoint al principio funciona' });
});

const notion = new Client({ 
  auth: process.env.VITE_NOTION_TOKEN 
});

// Inicializar base de datos al arrancar el servidor
initializeDatabase().then(success => {
  if (success) {
    console.log('🗄️ Base de datos inicializada correctamente');
  } else {
    console.log('⚠️ Continuando sin base de datos local (solo funciones de Notion disponibles)');
  }
});

// Test básico
app.get('/test', async (req, res) => {
  try {
    const response = await notion.users.me();
    res.json({ success: true, user: response });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Test simple para verificar que el código se está cargando
app.get('/test-simple', (req, res) => {
  console.log('🧪 Test simple endpoint llamado');
  res.json({ message: 'Código cargado correctamente', timestamp: new Date().toISOString() });
});

// Limpiar cache de bases de datos
app.post('/clear-cache', (req, res) => {
  console.log('🗑️ Limpiando cache de bases de datos...');
  // Limpiar variables de cache si existen
  if (global.databasesCache) {
    delete global.databasesCache;
    console.log('✅ Cache de bases de datos limpiado');
  }
  res.json({ success: true, message: 'Cache limpiado correctamente' });
});

// ==================== ENDPOINTS DE PLANIFICACIÓN (TEMP) ====================

console.log('🔧 DEBUG: Registrando endpoints de planificación TEMP...');

// Test endpoint simple
app.get('/test-planning', (req, res) => {
  console.log('🧪 Test planning endpoint llamado');
  res.json({ message: 'Planning endpoints funcionando', timestamp: new Date().toISOString() });
});

// Obtener todas las sesiones de planificación de un grupo
app.get('/groups/:groupId/planning-sessions', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('📅 Obteniendo sesiones de planificación para grupo:', groupId);
    
    const sessions = await DatabaseService.getPlanningSessionsByGroup(groupId);
    
    console.log('✅ Sesiones de planificación obtenidas:', sessions.length);
    sessions.forEach((session, index) => {
      console.log(`🔥 Sesión ${index + 1}: ${session.sessionName}`);
      console.log(`  - ID: ${session.id}`);
      console.log(`  - databaseId: ${session.databaseId}`);
      console.log(`  - databaseIds: ${JSON.stringify(session.databaseIds)}`);
      console.log(`  - selectedFlashcards: ${session.selectedFlashcards?.length || 0}`);
    });
    
    res.json(sessions);
  } catch (error) {
    console.error('❌ Error obteniendo sesiones de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva sesión de planificación
app.post('/groups/:groupId/planning-sessions', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      sessionName, 
      databaseId, 
      databaseIds, // Nueva propiedad para múltiples bases de datos
      sessionNote, 
      studyMode,
      selectedFlashcards,
      orderIndex 
    } = req.body;
    
    if (!sessionName || sessionName.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre de la sesión es requerido' });
    }
    
    // Validar que haya al menos una base de datos (compatibilidad hacia atrás)
    const finalDatabaseId = databaseId || (databaseIds && databaseIds.length > 0 ? databaseIds[0] : null);
    if (!finalDatabaseId) {
      return res.status(400).json({ error: 'Al menos una base de datos es requerida' });
    }
    
    if (!studyMode || !['review', 'matching', 'overview'].includes(studyMode)) {
      return res.status(400).json({ error: 'Modo de estudio inválido' });
    }
    
    console.log('📅 Creando sesión de planificación para grupo:', groupId);
    console.log('📋 Flashcards seleccionadas:', selectedFlashcards?.length || 0);
    console.log('🗄️ Bases de datos recibidas:', databaseIds);
    console.log('🔧 DEBUG - Todos los datos recibidos:', {
      sessionName,
      databaseId,
      databaseIds,
      selectedFlashcards: selectedFlashcards?.length || 0,
      finalDatabaseId,
      orderIndex
    });
    
    // CORRECCIÓN CRÍTICA: Asegurar que databaseIds siempre sea un array válido
    const finalDatabaseIds = databaseIds && Array.isArray(databaseIds) && databaseIds.length > 0 
      ? databaseIds 
      : [finalDatabaseId];
    
    console.log('🔧 DEBUG - finalDatabaseIds que se enviará a la función:', finalDatabaseIds);
    
    const session = await DatabaseService.createPlanningSession(
      groupId,
      sessionName.trim(),
      finalDatabaseId, // Usar la primera DB para compatibilidad con el esquema actual
      sessionNote?.trim() || '',
      studyMode,
      selectedFlashcards || [],
      orderIndex || null, // Asegurar que orderIndex no sea undefined
      finalDatabaseIds // Pasar el array corregido
    );
    
    console.log('✅ Sesión de planificación creada:', session.id);
    console.log('🔧 DEBUG - Sesión creada con databaseIds:', session.databaseIds);
    console.log('🔧 DEBUG - Sesión creada con selectedFlashcards:', session.selectedFlashcards?.length || 0);
    res.status(201).json(session);
  } catch (error) {
    console.error('❌ Error creando sesión de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE PUNTOS DE REFERENCIA ====================

// Obtener puntos de referencia de una flashcard
app.get('/flashcards/:flashcardId/reference-points', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    console.log('📍 Obteniendo puntos de referencia para flashcard:', flashcardId);
    
    const referencePoints = await DatabaseService.getReferencePoints(flashcardId);
    
    console.log('✅ Puntos de referencia obtenidos:', referencePoints.length);
    res.json(referencePoints);
  } catch (error) {
    console.error('❌ Error obteniendo puntos de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo punto de referencia
app.post('/flashcards/:flashcardId/reference-points', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { 
      selectedText, 
      referenceName, 
      databaseId, 
      textPosition, 
      blockId, 
      contextBefore, 
      contextAfter, 
      category, 
      color 
    } = req.body;
    
    if (!selectedText || selectedText.trim().length === 0) {
      return res.status(400).json({ error: 'El texto seleccionado es requerido' });
    }
    
    if (!referenceName || referenceName.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre del punto de referencia es requerido' });
    }
    
    console.log('📍 Creando punto de referencia para flashcard:', flashcardId);
    
    const referencePoint = await DatabaseService.createReferencePoint(
      flashcardId,
      databaseId,
      selectedText.trim(),
      referenceName.trim(),
      {
        textPosition,
        blockId,
        contextBefore,
        contextAfter,
        category: category || 'general',
        color: color || '#3B82F6'
      }
    );
    
    console.log('✅ Punto de referencia creado:', referencePoint.id);
    res.status(201).json(referencePoint);
  } catch (error) {
    console.error('❌ Error creando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar punto de referencia
app.put('/reference-points/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const updates = req.body;
    
    console.log('📍 Actualizando punto de referencia:', referenceId);
    
    const updated = await DatabaseService.updateReferencePoint(referenceId, updates);
    
    if (updated) {
      console.log('✅ Punto de referencia actualizado');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Punto de referencia no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error actualizando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar punto de referencia
app.delete('/reference-points/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    
    console.log('📍 Eliminando punto de referencia:', referenceId);
    
    const deleted = await DatabaseService.deleteReferencePoint(referenceId);
    
    if (deleted) {
      console.log('✅ Punto de referencia eliminado');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Punto de referencia no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error eliminando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener conteo de puntos de referencia por base de datos
app.get('/databases/:databaseId/reference-points-count', async (req, res) => {
  try {
    const { databaseId } = req.params;
    
    console.log('📍 Obteniendo conteos de puntos de referencia para base de datos:', databaseId);
    
    const referencePointsCounts = await DatabaseService.getReferencePointsCountByDatabase(databaseId);
    
    console.log('✅ Conteos de puntos de referencia obtenidos:', Object.keys(referencePointsCounts).length, 'flashcards');
    res.json(referencePointsCounts);
  } catch (error) {
    console.error('❌ Error obteniendo conteos de puntos de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar bases de datos por nombre
app.get('/databases/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;
    
    if (!query || query.trim().length === 0) {
      return res.json([]);
    }
    
    console.log('🔍 Buscando bases de datos con query:', query);
    
    const databases = [];
    let hasMore = true;
    let nextCursor = undefined;
    let totalResults = 0;
    let allPages = [];
    
    // Buscar todas las páginas con paginación completa
    while (hasMore) {
      console.log(`📄 Obteniendo página ${Math.floor(totalResults/100) + 1} de búsqueda...`);
      
      const searchParams = {
        query: '',
        page_size: 100,
        filter: {
          value: 'page',
          property: 'object'
        }
      };
      
      if (nextCursor) {
        searchParams.start_cursor = nextCursor;
      }
      
      const response = await notion.search(searchParams);
      
      console.log(`📊 Páginas obtenidas en esta búsqueda: ${response.results.length}`);
      totalResults += response.results.length;
      
      allPages.push(...response.results);
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      if (hasMore) {
        console.log('📄 Hay más páginas en la búsqueda, continuando...');
      }
    }

    console.log(`📊 Total páginas encontradas: ${allPages.length}`);
    
    // Agrupar páginas por base de datos
    const databasePageCounts = new Map();
    const databaseIds = new Set();
    
    for (const item of allPages) {
      if (item.object === 'page' && item.parent) {
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
        }
        
        if (databaseId) {
          databasePageCounts.set(databaseId, (databasePageCounts.get(databaseId) || 0) + 1);
          databaseIds.add(databaseId);
        }
      }
    }
    
    console.log(`📊 Bases de datos únicas encontradas: ${databaseIds.size}`);
    
    // Obtener información de cada base de datos y filtrar por query
    for (const databaseId of databaseIds) {
      try {
        console.log('🔍 Obteniendo info de base de datos:', databaseId);
        const database = await notion.databases.retrieve({ database_id: databaseId });
        
        const title = database.title?.[0]?.plain_text || 'Sin título';
        const icon = database.icon?.emoji || '📄';
        
        // Filtrar por query (búsqueda case-insensitive)
        if (title.toLowerCase().includes(query.toLowerCase())) {
          const actualCount = databasePageCounts.get(databaseId) || 0;
          
          console.log('✅ Base de datos encontrada:', title, 'con', actualCount, 'páginas');
          
          databases.push({
            id: database.id,
            name: title,
            icon: icon,
            cardCount: actualCount,
            lastSynced: new Date(database.last_edited_time),
            source: 'notion',
          });
          
          // Limitar resultados
          if (databases.length >= parseInt(limit)) {
            break;
          }
        }
      } catch (dbError) {
        console.error('❌ Error obteniendo base de datos:', databaseId, dbError.message);
      }
    }

    console.log('📊 Bases de datos que coinciden con la búsqueda:', databases.length);
    res.json(databases);
  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache para bases de datos (15 minutos de TTL)
const databasesCache = new Map();
const DATABASES_CACHE_TTL = 15 * 60 * 1000; // 15 minutos

// Bases de datos - detección automática con cache
app.get('/databases', async (req, res) => {
  try {
    const { force_refresh } = req.query; // Parámetro para forzar actualización
    
    console.log('🔍 Buscando todas las bases de datos compartidas...');
    
    // Verificar cache primero (a menos que sea refresh forzado)
    const cacheKey = 'all_databases';
    const cached = databasesCache.get(cacheKey);
    
    if (!force_refresh && cached && (Date.now() - cached.timestamp) < DATABASES_CACHE_TTL) {
      console.log('⚡ Usando cache para bases de datos:', cached.databases.length);
      return res.json(cached.databases);
    }
    
    console.log(force_refresh ? '🔄 Sincronización forzada iniciada...' : '🔄 Cargando bases de datos...');
    
    const databases = [];
    let hasMore = true;
    let nextCursor = undefined;
    let totalResults = 0;
    let allPages = [];
    
    // Buscar todas las páginas con paginación completa
    while (hasMore) {
      console.log(`📄 Obteniendo página ${Math.floor(totalResults/100) + 1} de búsqueda...`);
      
      const searchParams = {
        query: '',
        page_size: 100,
        filter: {
          value: 'page',
          property: 'object'
        }
      };
      
      if (nextCursor) {
        searchParams.start_cursor = nextCursor;
      }
      
      const response = await notion.search(searchParams);
      
      console.log(`📊 Páginas obtenidas en esta búsqueda: ${response.results.length}`);
      totalResults += response.results.length;
      
      allPages.push(...response.results);
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      if (hasMore) {
        console.log('📄 Hay más páginas en la búsqueda, continuando...');
      }
    }

    console.log(`📊 Total páginas encontradas: ${allPages.length}`);
    
    // Agrupar páginas por base de datos
    const databasePageCounts = new Map();
    const databaseIds = new Set();
    
    for (const item of allPages) {
      if (item.object === 'page' && item.parent) {
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
        }
        
        if (databaseId) {
          databasePageCounts.set(databaseId, (databasePageCounts.get(databaseId) || 0) + 1);
          databaseIds.add(databaseId);
        }
      }
    }
    
    console.log(`📊 Bases de datos únicas encontradas: ${databaseIds.size}`);
    
    // Obtener información de cada base de datos
    for (const databaseId of databaseIds) {
      try {
        console.log('🔍 Obteniendo info de base de datos:', databaseId);
        const database = await notion.databases.retrieve({ database_id: databaseId });
        
        const title = database.title?.[0]?.plain_text || 'Sin título';
        const icon = database.icon?.emoji || '📄';
        
        // Usar el conteo real de páginas
        const actualCount = databasePageCounts.get(databaseId) || 0;
        
        console.log('✅ Base de datos encontrada:', title, 'con', actualCount, 'páginas');
        
        databases.push({
          id: database.id,
          name: title,
          icon: icon,
          cardCount: actualCount,
          lastSynced: new Date(database.last_edited_time),
          source: 'notion',
        });
      } catch (dbError) {
        console.error('❌ Error obteniendo base de datos:', databaseId, dbError.message);
      }
    }

    console.log('📊 Total bases de datos procesadas:', databases.length);
    
    // Guardar en cache
    databasesCache.set(cacheKey, {
      databases,
      timestamp: Date.now()
    });
    
    console.log('💾 Bases de datos guardadas en cache por 15 minutos');
    
    res.json(databases);
  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para sincronizar bases de datos manualmente
app.post('/databases/sync', async (req, res) => {
  try {
    console.log('🔄 Sincronización manual de bases de datos iniciada...');
    
    // Limpiar TODOS los caches
    databasesCache.clear();
    console.log('🗑️ Cache de bases de datos limpiado completamente');
    
    // Hacer la búsqueda directamente (sin usar fetch interno)
    const databases = [];
    let hasMore = true;
    let nextCursor = undefined;
    let totalResults = 0;
    let allPages = [];
    
    // Buscar todas las páginas con paginación completa
    while (hasMore) {
      console.log(`📄 Obteniendo página ${Math.floor(totalResults/100) + 1} de búsqueda...`);
      
      const searchParams = {
        query: '',
        page_size: 100,
        filter: {
          value: 'page',
          property: 'object'
        }
      };
      
      if (nextCursor) {
        searchParams.start_cursor = nextCursor;
      }
      
      const response = await notion.search(searchParams);
      
      console.log(`📊 Páginas obtenidas en esta búsqueda: ${response.results.length}`);
      totalResults += response.results.length;
      
      allPages.push(...response.results);
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      if (hasMore) {
        console.log('📄 Hay más páginas en la búsqueda, continuando...');
      }
    }

    console.log(`📊 Total páginas encontradas: ${allPages.length}`);
    
    // Agrupar páginas por base de datos
    const databasePageCounts = new Map();
    const databaseIds = new Set();
    
    for (const item of allPages) {
      if (item.object === 'page' && item.parent) {
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
        }
        
        if (databaseId) {
          databasePageCounts.set(databaseId, (databasePageCounts.get(databaseId) || 0) + 1);
          databaseIds.add(databaseId);
        }
      }
    }
    
    console.log(`📊 Bases de datos únicas encontradas: ${databaseIds.size}`);
    
    // Obtener información de cada base de datos
    for (const databaseId of databaseIds) {
      try {
        console.log('🔍 Obteniendo info de base de datos:', databaseId);
        const database = await notion.databases.retrieve({ database_id: databaseId });
        
        const title = database.title?.[0]?.plain_text || 'Sin título';
        const icon = database.icon?.emoji || '📄';
        
        // Usar el conteo real de páginas
        const actualCount = databasePageCounts.get(databaseId) || 0;
        
        console.log('✅ Base de datos encontrada:', title, 'con', actualCount, 'páginas');
        
        databases.push({
          id: database.id,
          name: title,
          icon: icon,
          cardCount: actualCount,
          lastSynced: new Date(database.last_edited_time),
          source: 'notion',
        });
      } catch (dbError) {
        console.error('❌ Error obteniendo base de datos:', databaseId, dbError.message);
      }
    }

    console.log('📊 Total bases de datos procesadas:', databases.length);
    
    // Guardar en cache con timestamp nuevo
    const cacheKey = 'all_databases';
    databasesCache.set(cacheKey, {
      databases,
      timestamp: Date.now()
    });
    
    console.log('💾 Bases de datos guardadas en cache actualizado');
    
    res.json({ 
      success: true, 
      message: 'Bases de datos sincronizadas correctamente',
      count: databases.length,
      databases 
    });
  } catch (error) {
    console.error('❌ Error en sincronización manual:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Ruta alternativa para compatibilidad con el frontend
app.post('/notion/databases/sync', async (req, res) => {
  try {
    console.log('🔄 Sincronización manual de bases de datos iniciada (ruta /notion/databases/sync)...');
    
    // Limpiar TODOS los caches
    databasesCache.clear();
    console.log('🗑️ Cache de bases de datos limpiado completamente');
    
    // Hacer la búsqueda directamente
    const databases = [];
    let hasMore = true;
    let nextCursor = undefined;
    let totalResults = 0;
    let allPages = [];
    
    // Buscar todas las páginas con paginación completa
    while (hasMore) {
      console.log(`📄 Obteniendo página ${Math.floor(totalResults/100) + 1} de búsqueda...`);
      
      const searchParams = {
        query: '',
        page_size: 100,
        filter: {
          value: 'page',
          property: 'object'
        }
      };
      
      if (nextCursor) {
        searchParams.start_cursor = nextCursor;
      }
      
      const response = await notion.search(searchParams);
      
      console.log(`📊 Páginas obtenidas en esta búsqueda: ${response.results.length}`);
      totalResults += response.results.length;
      
      allPages.push(...response.results);
      
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      if (hasMore) {
        console.log('📄 Hay más páginas en la búsqueda, continuando...');
      }
    }

    console.log(`📊 Total páginas encontradas: ${allPages.length}`);
    
    // Agrupar páginas por base de datos
    const databasePageCounts = new Map();
    const databaseIds = new Set();
    
    for (const item of allPages) {
      if (item.object === 'page' && item.parent) {
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
        }
        
        if (databaseId) {
          databasePageCounts.set(databaseId, (databasePageCounts.get(databaseId) || 0) + 1);
          databaseIds.add(databaseId);
        }
      }
    }
    
    console.log(`📊 Bases de datos únicas encontradas: ${databaseIds.size}`);
    
    // Obtener información de cada base de datos
    for (const databaseId of databaseIds) {
      try {
        console.log('🔍 Obteniendo info de base de datos:', databaseId);
        const database = await notion.databases.retrieve({ database_id: databaseId });
        
        const title = database.title?.[0]?.plain_text || 'Sin título';
        const icon = database.icon?.emoji || '📄';
        
        // Usar el conteo real de páginas
        const actualCount = databasePageCounts.get(databaseId) || 0;
        
        console.log('✅ Base de datos encontrada:', title, 'con', actualCount, 'páginas');
        
        databases.push({
          id: database.id,
          name: title,
          icon: icon,
          cardCount: actualCount,
          lastSynced: new Date(database.last_edited_time),
          source: 'notion',
        });
      } catch (dbError) {
        console.error('❌ Error obteniendo base de datos:', databaseId, dbError.message);
      }
    }

    console.log('📊 Total bases de datos procesadas:', databases.length);
    
    // Guardar en cache con timestamp nuevo
    const cacheKey = 'all_databases';
    databasesCache.set(cacheKey, {
      databases,
      timestamp: Date.now()
    });
    
    console.log('💾 Bases de datos guardadas en cache actualizado');
    
    res.json({ 
      success: true, 
      message: 'Bases de datos sincronizadas correctamente',
      count: databases.length,
      databases 
    });
  } catch (error) {
    console.error('❌ Error en sincronización manual:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Cache para flashcards (5 minutos de TTL)
const flashcardsCache = new Map();
const FLASHCARDS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Obtener flashcards de una base de datos (MÉTODO ORIGINAL QUE FUNCIONABA)
app.get('/databases/:databaseId/flashcards', async (req, res) => {
  try {
    const { databaseId } = req.params;
    console.log('🚀 Obteniendo flashcards para:', databaseId);
    
    // Verificar cache primero
    const cacheKey = databaseId;
    const cached = flashcardsCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < FLASHCARDS_CACHE_TTL) {
      console.log('⚡ Usando cache para flashcards:', cached.flashcards.length);
      return res.json(cached.flashcards);
    }
    
    const startTime = Date.now();
    const flashcards = [];
    let hasMore = true;
    let nextCursor = undefined;
    let pagesProcessed = 0;
    
    console.log(`🎯 Buscando TODAS las flashcards de la base de datos ${databaseId}`);
    
    while (hasMore) {
      console.log(`📄 Página ${pagesProcessed + 1}...`);
      
      const response = await notion.search({
        query: '',
        page_size: 100,
        start_cursor: nextCursor,
        filter: {
          value: 'page',
          property: 'object'
        }
      });
      
      const pagesInThisDb = response.results.filter((page) => 
        page.object === 'page' &&
        page.parent && 
        page.parent.database_id === databaseId
      );
      
      console.log(`📊 Páginas totales en esta búsqueda: ${response.results.length}`);
      console.log(`📊 Páginas de esta DB específica: ${pagesInThisDb.length}`);
      
      // Procesar TODAS las páginas encontradas de esta base de datos
      const batchPromises = pagesInThisDb.map(async (page) => {
        if (page.properties) {
          const properties = page.properties;

          // Buscar título (columna "Nombre")
          const titleProperty = Object.values(properties).find((prop) => prop.type === 'title');
          const title = titleProperty ? 
            titleProperty.title?.map((t) => t.plain_text).join('') || 'Sin título' : 'Sin título';

          // Buscar estado en la columna "Dominio" (OPTIMIZADO)
          let state = 'tocado';
          const dominioProperty = properties['Dominio'];
          if (dominioProperty && dominioProperty.type === 'select' && dominioProperty.select) {
            const dominioValue = dominioProperty.select.name;
            switch (dominioValue?.toLowerCase()) {
              case 'verde': state = 'verde'; break;
              case 'solido':
              case 'sólido': state = 'solido'; break;
              default: state = 'tocado';
            }
          }

          // Buscar notas en "Nota Propia" (OPTIMIZADO)
          let notes = '';
          const notaProperty = properties['Nota Propia'];
          if (notaProperty && notaProperty.type === 'rich_text') {
            notes = notaProperty.rich_text?.map((t) => t.plain_text).join('') || '';
          }

          // Conceptos relacionados - ahora se procesan en auxiliaryInfo
          let relatedConcepts = [];

          // Procesar TODAS las propiedades adicionales para información auxiliar
          const auxiliaryInfo = {};
          const excludedProps = ['Dominio', 'Nota Propia', 'Ultima vez repasado', 'Último repaso', 'Last reviewed', 'Fecha repaso'];
          
          for (const [propName, propValue] of Object.entries(properties)) {
            // Saltar propiedades ya procesadas, títulos y propiedades de sistema
            if (excludedProps.includes(propName) || propValue.type === 'title' || !propValue) {
              continue;
            }
            
            let value = '';
            switch (propValue.type) {
              case 'rich_text':
                value = propValue.rich_text?.map((t) => t.plain_text).join('') || '';
                break;
              case 'select':
                value = propValue.select?.name || '';
                break;
              case 'multi_select':
                value = propValue.multi_select?.map((s) => s.name).join(', ') || '';
                break;
              case 'date':
                if (propValue.date?.start) {
                  value = new Date(propValue.date.start).toLocaleDateString('es-ES');
                }
                break;
              case 'number':
                value = propValue.number?.toString() || '';
                break;
              case 'checkbox':
                value = propValue.checkbox ? 'Sí' : 'No';
                break;
              case 'url':
                value = propValue.url || '';
                break;
              case 'email':
                value = propValue.email || '';
                break;
              case 'phone_number':
                value = propValue.phone_number || '';
                break;
              case 'formula':
                if (propValue.formula?.string) {
                  value = propValue.formula.string;
                } else if (propValue.formula?.number) {
                  value = propValue.formula.number.toString();
                } else if (propValue.formula?.boolean !== undefined) {
                  value = propValue.formula.boolean ? 'Sí' : 'No';
                } else if (propValue.formula?.date?.start) {
                  value = new Date(propValue.formula.date.start).toLocaleDateString('es-ES');
                }
                break;
              case 'rollup':
                if (propValue.rollup?.array) {
                  value = propValue.rollup.array.map(item => {
                    if (item.rich_text) return item.rich_text.map(t => t.plain_text).join('');
                    if (item.number) return item.number.toString();
                    if (item.select) return item.select.name;
                    return '';
                  }).filter(v => v).join(', ');
                }
                break;
              case 'relation':
                // Para relaciones, obtener los nombres de las páginas relacionadas
                if (propValue.relation && propValue.relation.length > 0) {
                  try {
                    const relationNames = [];
                    for (const relation of propValue.relation) {
                      if (relation.id) {
                        try {
                          const relatedPage = await notion.pages.retrieve({ page_id: relation.id });
                          // Obtener el título de la página relacionada
                          const titleProperty = Object.values(relatedPage.properties).find(prop => prop.type === 'title');
                          if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
                            const title = titleProperty.title.map(t => t.plain_text).join('');
                            relationNames.push(title);
                          } else {
                            relationNames.push('Sin título');
                          }
                        } catch (error) {
                          console.error('Error obteniendo página relacionada:', error);
                          relationNames.push('Página no accesible');
                        }
                      }
                    }
                    value = relationNames.length > 0 ? relationNames.join(', ') : `${propValue.relation.length} elemento(s) relacionado(s)`;
                  } catch (error) {
                    console.error('Error procesando relaciones:', error);
                    value = `${propValue.relation.length} elemento(s) relacionado(s)`;
                  }
                }
                break;
              case 'people':
                value = propValue.people?.map(person => person.name || 'Usuario').join(', ') || '';
                break;
              case 'files':
                if (propValue.files && propValue.files.length > 0) {
                  value = `${propValue.files.length} archivo(s)`;
                }
                break;
              default:
                // Para tipos no reconocidos, intentar obtener texto básico
                if (propValue.plain_text) {
                  value = propValue.plain_text;
                }
                break;
            }
            
            // Solo agregar si tiene valor
            if (value && value.trim()) {
              auxiliaryInfo[propName] = {
                type: propValue.type,
                value: value.trim()
              };
            }
          }

          return {
            id: page.id,
            title,
            content: title || 'Sin contenido disponible',
            state,
            lastReviewed: null,
            notes,
            relatedConcepts,
            auxiliaryInfo,
            databaseId,
            createdAt: new Date(page.created_time),
            viewCount: 0,
            reviewNotes: [],
          };
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(card => card !== null);
      flashcards.push(...validResults);
      
      pagesProcessed++;
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      console.log(`📊 Flashcards de esta DB encontradas en esta página: ${validResults.length}`);
      console.log(`📊 Total flashcards de esta DB hasta ahora: ${flashcards.length}`);
      console.log(`📄 ¿Hay más páginas en Notion?: ${response.has_more}`);
      
      // CRÍTICO: Continuar hasta que Notion diga que no hay más páginas
      if (!response.has_more) {
        console.log(`🏁 FINAL: Búsqueda completa terminada.`);
        console.log(`📊 Total flashcards encontradas para esta DB: ${flashcards.length}`);
        break;
      }
    }
    
    const endTime = Date.now();
    console.log(`🚀 COMPLETADO: ${flashcards.length} flashcards procesadas en ${endTime - startTime}ms`);
    console.log('📊 Estados:', {
      tocado: flashcards.filter(f => f.state === 'tocado').length,
      verde: flashcards.filter(f => f.state === 'verde').length,
      solido: flashcards.filter(f => f.state === 'solido').length,
    });
    
    // Guardar en cache
    flashcardsCache.set(cacheKey, {
      flashcards,
      timestamp: Date.now()
    });
    
    res.json(flashcards);
  } catch (error) {
    console.error('❌ Error fetching flashcards:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache para bloques hijos para evitar llamadas repetidas
const blockChildrenCache = new Map();

// Función auxiliar para obtener bloques hijos recursivamente con cache
async function getBlockChildren(blockId, depth = 0) {
  if (depth > 5) return []; // Aumentar a 5 niveles de profundidad para contenido completo
  
  // Verificar cache primero
  const cacheKey = `${blockId}_${depth}`;
  if (blockChildrenCache.has(cacheKey)) {
    return blockChildrenCache.get(cacheKey);
  }
  
  try {
    console.log(`🔍 Obteniendo hijos del bloque ${blockId} (profundidad: ${depth})`);
    
    let allChildren = [];
    let hasMore = true;
    let nextCursor = undefined;
    
    // Obtener TODOS los hijos con paginación
    while (hasMore) {
      const children = await notion.blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: nextCursor
      });
      
      allChildren.push(...children.results);
      hasMore = children.has_more;
      nextCursor = children.next_cursor;
      
      console.log(`📊 Hijos obtenidos en esta página: ${children.results.length}, total: ${allChildren.length}`);
      
      if (!hasMore) break;
    }
    
    console.log(`📊 Total hijos encontrados: ${allChildren.length}`);
    console.log('🔍 Tipos de hijos:', allChildren.map(c => c.type));
    
    const processedChildren = [];
    
    // Procesar TODOS los hijos para contenido completo
    for (const child of allChildren) {
      if ('type' in child) {
        const processedChild = {
          id: child.id,
          type: child.type,
          content: null,
          children: [],
          hasChildren: child.has_children || false
        };

        // Procesar TODOS los tipos de bloques comunes
        switch (child.type) {
          case 'paragraph':
            processedChild.content = {
              rich_text: child.paragraph?.rich_text || []
            };
            break;
          case 'heading_1':
            processedChild.content = {
              rich_text: child.heading_1?.rich_text || []
            };
            break;
          case 'heading_2':
            processedChild.content = {
              rich_text: child.heading_2?.rich_text || []
            };
            break;
          case 'heading_3':
            processedChild.content = {
              rich_text: child.heading_3?.rich_text || []
            };
            break;
          case 'bulleted_list_item':
            processedChild.content = {
              rich_text: child.bulleted_list_item?.rich_text || []
            };
            break;
          case 'numbered_list_item':
            processedChild.content = {
              rich_text: child.numbered_list_item?.rich_text || []
            };
            break;
          case 'to_do':
            processedChild.content = {
              rich_text: child.to_do?.rich_text || [],
              checked: child.to_do?.checked || false
            };
            break;
          case 'toggle':
            processedChild.content = {
              rich_text: child.toggle?.rich_text || []
            };
            // Solo obtener hijos si la profundidad es 0 (primer nivel)
            if (depth === 0) {
              processedChild.children = await getBlockChildren(child.id, depth + 1);
            }
            break;
          case 'callout':
            processedChild.content = {
              rich_text: child.callout?.rich_text || [],
              icon: child.callout?.icon
            };
            break;
          case 'quote':
            processedChild.content = {
              rich_text: child.quote?.rich_text || []
            };
            break;
          case 'code':
            processedChild.content = {
              rich_text: child.code?.rich_text || [],
              language: child.code?.language
            };
            break;
          case 'divider':
            processedChild.content = {};
            break;
          case 'image':
            processedChild.content = {
              file: child.image?.file || null,
              external: child.image?.external || null,
              caption: child.image?.caption || []
            };
            break;
          case 'table':
            console.log('🔍 TABLA DETECTADA EN HIJOS:', child.table);
            processedChild.content = {
              table_width: child.table?.table_width || 0,
              has_column_header: child.table?.has_column_header || false,
              has_row_header: child.table?.has_row_header || false
            };
            // Las tablas siempre necesitan cargar sus filas
            if (child.has_children) {
              processedChild.children = await getBlockChildren(child.id, depth + 1);
            }
            break;
          case 'table_row':
            console.log('🔍 FILA DE TABLA DETECTADA EN HIJOS:', child.table_row);
            processedChild.content = {
              cells: child.table_row?.cells || []
            };
            break;
          default:
            // Para otros tipos, intentar obtener el texto básico
            console.log(`⚠️ Tipo de bloque no reconocido: ${child.type}`);
            const richTextField = child[child.type]?.rich_text;
            if (richTextField) {
              processedChild.content = { rich_text: richTextField };
            } else {
              // Si no hay rich_text, crear contenido vacío pero válido
              processedChild.content = { rich_text: [] };
            }
            break;
        }
        
        console.log(`✅ Procesado bloque hijo: ${child.type} con contenido:`, 
          processedChild.content?.rich_text?.length || 0, 'elementos de texto');
        
        processedChildren.push(processedChild);
      }
    }
    
    console.log(`✅ Total hijos procesados: ${processedChildren.length}`);
    
    // Guardar en cache por 5 minutos
    blockChildrenCache.set(cacheKey, processedChildren);
    setTimeout(() => blockChildrenCache.delete(cacheKey), 5 * 60 * 1000);
    
    return processedChildren;
  } catch (error) {
    console.error(`❌ Error fetching children for block ${blockId}:`, error);
    return [];
  }
}

// Obtener contenido detallado de una flashcard específica
app.get('/flashcards/:flashcardId/content', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    console.log('🔍 Obteniendo contenido detallado para flashcard:', flashcardId);
    
    const startTime = Date.now();
    
    // Obtener TODOS los bloques con paginación
    let allBlocks = [];
    let hasMore = true;
    let nextCursor = undefined;
    
    while (hasMore) {
      const blocks = await notion.blocks.children.list({
        block_id: flashcardId,
        page_size: 100,
        start_cursor: nextCursor
      });
      
      allBlocks.push(...blocks.results);
      hasMore = blocks.has_more;
      nextCursor = blocks.next_cursor;
      
      console.log(`📊 Bloques obtenidos en esta página: ${blocks.results.length}, total: ${allBlocks.length}`);
      
      if (!hasMore) break;
    }

    // Procesar bloques principales Y cargar hijos automáticamente para contenido completo
    const processedBlocks = [];
    
    for (const block of allBlocks) {
      if ('type' in block) {
        const processedBlock = {
          id: block.id,
          type: block.type,
          content: null,
          hasChildren: block.has_children || false,
          children: [] // Inicializar array de hijos
        };

        switch (block.type) {
          case 'paragraph':
            processedBlock.content = {
              rich_text: block.paragraph?.rich_text || []
            };
            break;
          case 'heading_1':
            processedBlock.content = {
              rich_text: block.heading_1?.rich_text || []
            };
            break;
          case 'heading_2':
            processedBlock.content = {
              rich_text: block.heading_2?.rich_text || []
            };
            break;
          case 'heading_3':
            processedBlock.content = {
              rich_text: block.heading_3?.rich_text || []
            };
            break;
          case 'bulleted_list_item':
            processedBlock.content = {
              rich_text: block.bulleted_list_item?.rich_text || []
            };
            break;
          case 'numbered_list_item':
            processedBlock.content = {
              rich_text: block.numbered_list_item?.rich_text || []
            };
            break;
          case 'toggle':
            processedBlock.content = {
              rich_text: block.toggle?.rich_text || []
            };
            break;
          case 'callout':
            processedBlock.content = {
              rich_text: block.callout?.rich_text || [],
              icon: block.callout?.icon
            };
            break;
          case 'quote':
            processedBlock.content = {
              rich_text: block.quote?.rich_text || []
            };
            break;
          case 'code':
            processedBlock.content = {
              rich_text: block.code?.rich_text || [],
              language: block.code?.language
            };
            break;
          case 'divider':
            processedBlock.content = {};
            break;
          case 'to_do':
            processedBlock.content = {
              rich_text: block.to_do?.rich_text || [],
              checked: block.to_do?.checked || false
            };
            break;
          case 'image':
            processedBlock.content = {
              file: block.image?.file || null,
              external: block.image?.external || null,
              caption: block.image?.caption || []
            };
            break;
          case 'table':
            console.log('🔍 TABLA DETECTADA:', block.table);
            processedBlock.content = {
              table_width: block.table?.table_width || 0,
              has_column_header: block.table?.has_column_header || false,
              has_row_header: block.table?.has_row_header || false
            };
            break;
          case 'table_row':
            console.log('🔍 FILA DE TABLA DETECTADA:', block.table_row);
            processedBlock.content = {
              cells: block.table_row?.cells || []
            };
            break;
          default:
            // Para tipos no reconocidos, intentar obtener rich_text genérico
            console.log('⚠️ TIPO NO RECONOCIDO:', block.type, block);
            const richTextField = block[block.type]?.rich_text;
            if (richTextField) {
              processedBlock.content = { rich_text: richTextField };
            } else {
              processedBlock.content = { rich_text: [] };
            }
            break;
        }
        
        // CARGAR HIJOS AUTOMÁTICAMENTE para contenido completo
        if (block.has_children) {
          console.log(`🔍 Cargando hijos automáticamente para bloque ${block.type}:`, block.id);
          try {
            processedBlock.children = await getBlockChildren(block.id, 0);
            console.log(`✅ Hijos cargados: ${processedBlock.children.length}`);
          } catch (error) {
            console.error(`❌ Error cargando hijos para ${block.id}:`, error);
            processedBlock.children = [];
          }
        }
        
        processedBlocks.push(processedBlock);
      }
    }
    
    const endTime = Date.now();
    console.log(`✅ Contenido COMPLETO obtenido en ${endTime - startTime}ms, bloques:`, processedBlocks.length);
    
    res.json({ 
      blocks: processedBlocks,
      // Mantener compatibilidad con el formato anterior
      content: processedBlocks.map(block => {
        if (!block.content?.rich_text) return '';
        return block.content.rich_text.map(t => t.plain_text).join('');
      }).join('\n')
    });
  } catch (error) {
    console.error('❌ Error fetching flashcard content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Nuevo endpoint para cargar hijos de un bloque bajo demanda
app.get('/blocks/:blockId/children', async (req, res) => {
  try {
    const { blockId } = req.params;
    console.log('🔍 Obteniendo hijos del bloque:', blockId);
    
    const children = await getBlockChildren(blockId, 0);
    
    console.log('✅ Hijos obtenidos:', children.length);
    console.log('🔍 Tipos de hijos:', children.map(c => ({ type: c.type, hasChildren: c.hasChildren })));
    res.json({ children });
  } catch (error) {
    console.error('❌ Error fetching block children:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cache para propiedades de páginas (5 minutos de TTL)
const pagePropertiesCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Función helper para obtener propiedades de página con cache
async function getPageProperties(pageId) {
  const cacheKey = pageId;
  const cached = pagePropertiesCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.properties;
  }
  
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const properties = page.properties;
    
    // Guardar en cache
    pagePropertiesCache.set(cacheKey, {
      properties,
      timestamp: Date.now()
    });
    
    return properties;
  } catch (error) {
    console.error('Error obteniendo propiedades de página:', error);
    return null;
  }
}

// Actualizar estado de flashcard (optimizado)
app.put('/flashcards/:flashcardId/state', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { state } = req.body;
    
    console.log('🔄 Actualizando estado de flashcard:', flashcardId, 'a:', state);
    
    // Verificar si existe la columna "Dominio" antes de actualizar
    try {
      const page = await notion.pages.retrieve({ page_id: flashcardId });
      const properties = page.properties;
      
      console.log('🔍 Propiedades disponibles:', Object.keys(properties));
      console.log('🔍 Buscando columna "Dominio":', properties['Dominio'] ? 'ENCONTRADA' : 'NO ENCONTRADA');
      
      if (!properties['Dominio']) {
        console.log('⚠️ Columna "Dominio" no encontrada - enviando mensaje de error');
        return res.json({ 
          success: false, 
          updated: [],
          dominioMessage: 'Columna "Dominio" no encontrada en la base de datos. Para usar el sistema de estados de conocimiento, agrega una columna de tipo "Select" con el nombre "Dominio" y opciones: Tocado, Verde, Sólido a tu base de datos de Notion.'
        });
      }
      
      console.log('✅ Columna "Dominio" encontrada, procediendo con la actualización');
      
      // Solo si la columna existe, proceder con la actualización
      let dominioValue = 'Tocado';
      switch (state) {
        case 'tocado': dominioValue = 'Tocado'; break;
        case 'verde': dominioValue = 'Verde'; break;
        case 'solido': dominioValue = 'Sólido'; break;
      }
      
      await notion.pages.update({
        page_id: flashcardId,
        properties: {
          'Dominio': {
            select: { name: dominioValue }
          }
        }
      });
      
      console.log('✅ Estado actualizado en Notion exitosamente');
      
      // Invalidar cache para esta página
      pagePropertiesCache.delete(flashcardId);
      
      // Responder con éxito
      res.json({ 
        success: true, 
        updated: ['Dominio']
      });
      
    } catch (error) {
      console.error('❌ Error verificando propiedades de página:', error);
      res.status(500).json({ error: 'Error verificando estructura de la base de datos' });
    }
    
  } catch (error) {
    console.error('❌ Error en endpoint de estado:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar fecha de repaso (optimizado)
app.put('/flashcards/:flashcardId/review', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    
    console.log('📅 Actualizando fecha de repaso para flashcard:', flashcardId);
    
    // Obtener propiedades con cache
    const properties = await getPageProperties(flashcardId);
    
    if (!properties) {
      return res.status(500).json({ error: 'No se pudieron obtener las propiedades de la página' });
    }
    
    // Buscar el campo de fecha de repaso
    const lastReviewFields = ['Ultima vez repasado', 'Último repaso', 'Last reviewed', 'Fecha repaso'];
    let lastReviewField = null;
    
    for (const fieldName of lastReviewFields) {
      if (properties[fieldName] && properties[fieldName].type === 'date') {
        lastReviewField = fieldName;
        break;
      }
    }
    
    if (lastReviewField) {
      // Responder inmediatamente al cliente
      res.json({ 
        success: true, 
        updated: [lastReviewField]
      });
      
      // Actualizar en Notion de forma asíncrona
      setImmediate(async () => {
        try {
          await notion.pages.update({
            page_id: flashcardId,
            properties: {
              [lastReviewField]: {
                date: {
                  start: new Date().toISOString().split('T')[0]
                }
              }
            }
          });
          
          console.log('✅ Fecha de repaso actualizada en Notion (async)');
          
          // Invalidar cache para esta página
          pagePropertiesCache.delete(flashcardId);
        } catch (error) {
          console.error('❌ Error actualizando fecha en Notion (async):', error);
        }
      });
    } else {
      // Campo no encontrado
      const lastReviewMessage = 'Campo "Ultima vez repasado" no encontrado en la base de datos. Para habilitar el seguimiento automático de fechas de repaso, agrega una columna de tipo "Fecha" con el nombre "Ultima vez repasado" a tu base de datos de Notion.';
      console.log('⚠️ Campo de fecha de repaso no encontrado');
      
      res.json({ 
        success: false, 
        updated: [],
        lastReviewMessage 
      });
    }
    
  } catch (error) {
    console.error('❌ Error actualizando fecha de repaso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint combinado para actualizar estado y fecha de repaso (máxima eficiencia)
app.put('/flashcards/:flashcardId/complete-review', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { state } = req.body;
    
    console.log('🔄📅 Actualizando estado y fecha de repaso para flashcard:', flashcardId);
    
    // Responder inmediatamente al cliente
    res.json({ 
      success: true, 
      updated: ['Dominio', 'Ultima vez repasado']
    });
    
    // Actualizar ambos campos en una sola llamada a Notion (asíncrono)
    setImmediate(async () => {
      try {
        // Obtener propiedades con cache
        const properties = await getPageProperties(flashcardId);
        
        if (!properties) {
          console.error('❌ No se pudieron obtener propiedades para actualización combinada');
          return;
        }
        
        const updates = {};
        
        // Actualizar estado
        if (state) {
          let dominioValue = 'Tocado';
          switch (state) {
            case 'tocado': dominioValue = 'Tocado'; break;
            case 'verde': dominioValue = 'Verde'; break;
            case 'solido': dominioValue = 'Sólido'; break;
          }
          
          updates['Dominio'] = {
            select: { name: dominioValue }
          };
        }
        
        // Actualizar fecha de repaso
        const lastReviewFields = ['Ultima vez repasado', 'Último repaso', 'Last reviewed', 'Fecha repaso'];
        for (const fieldName of lastReviewFields) {
          if (properties[fieldName] && properties[fieldName].type === 'date') {
            updates[fieldName] = {
              date: {
                start: new Date().toISOString().split('T')[0]
              }
            };
            break;
          }
        }
        
        // Una sola llamada a Notion para ambas actualizaciones
        if (Object.keys(updates).length > 0) {
          await notion.pages.update({
            page_id: flashcardId,
            properties: updates
          });
          
          console.log('✅ Estado y fecha actualizados en Notion (async):', Object.keys(updates));
          
          // Invalidar cache
          pagePropertiesCache.delete(flashcardId);
        }
        
      } catch (error) {
        console.error('❌ Error en actualización combinada (async):', error);
      }
    });
    
  } catch (error) {
    console.error('❌ Error en endpoint combinado:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE NOTAS DE REPASO ====================

// Obtener notas de repaso de una flashcard
app.get('/flashcards/:flashcardId/notes', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    console.log('🔍 Obteniendo notas de repaso para flashcard:', flashcardId);
    
    const notes = await DatabaseService.getReviewNotes(flashcardId);
    
    console.log('✅ Notas obtenidas:', notes.length);
    res.json(notes);
  } catch (error) {
    console.error('❌ Error obteniendo notas de repaso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agregar nueva nota de repaso
app.post('/flashcards/:flashcardId/notes', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { content, databaseId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido de la nota es requerido' });
    }
    
    console.log('📝 Agregando nota de repaso para flashcard:', flashcardId);
    
    const note = await DatabaseService.addReviewNote(
      flashcardId, 
      databaseId, 
      content.trim()
    );
    
    console.log('✅ Nota agregada:', note.id);
    res.status(201).json(note);
  } catch (error) {
    console.error('❌ Error agregando nota de repaso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar nota de repaso
app.delete('/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    
    console.log('🗑️ Eliminando nota de repaso:', noteId);
    
    // Agregar método para eliminar nota
    await DatabaseService.deleteReviewNote(noteId);
    
    console.log('✅ Nota eliminada');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error eliminando nota de repaso:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar nota de repaso
app.put('/notes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido de la nota es requerido' });
    }
    
    console.log('✏️ Actualizando nota de repaso:', noteId);
    
    const updated = await DatabaseService.updateReviewNote(noteId, content.trim());
    
    if (updated) {
      console.log('✅ Nota actualizada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Nota no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error actualizando nota de repaso:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE AGRUPACIONES ====================

// Obtener estadísticas rápidas de un grupo (SÚPER optimizado)
app.get('/groups/:groupId/stats', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('📊 Obteniendo estadísticas rápidas para grupo:', groupId);
    
    // Obtener la agrupación
    const group = await DatabaseService.getDatabaseGroup(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }
    
    if (!group.databaseIds || group.databaseIds.length === 0) {
      return res.json({ tocado: 0, verde: 0, solido: 0, total: 0 });
    }
    
    const stats = { tocado: 0, verde: 0, solido: 0, total: 0 };
    
    // Procesar bases de datos en paralelo usando consulta directa
    const statsPromises = group.databaseIds.map(async (dbId) => {
      try {
        console.log('📊 Procesando estadísticas de base de datos:', dbId);
        const startTime = Date.now();
        
        let dbStats = { tocado: 0, verde: 0, solido: 0, total: 0 };
        let hasMore = true;
        let nextCursor = undefined;
        
        // Usar consulta directa a la base de datos
        while (hasMore) {
          const response = await notion.search({
            query: '',
            page_size: 100,
            start_cursor: nextCursor,
            filter: {
              value: 'page',
              property: 'object'
            }
          });
          
          // Filtrar páginas que pertenecen a esta base de datos específica
          const pagesInThisDb = response.results.filter((page) => 
            page.object === 'page' &&
            page.parent && 
            page.parent.database_id === dbId
          );
          
          // Procesar páginas para estadísticas
          for (const page of pagesInThisDb) {
            if (page.properties) {
              const dominioProperty = page.properties['Dominio'];
              let state = 'tocado';
              
              if (dominioProperty && dominioProperty.type === 'select' && dominioProperty.select) {
                const dominioValue = dominioProperty.select.name;
                switch (dominioValue?.toLowerCase()) {
                  case 'verde': state = 'verde'; break;
                  case 'solido':
                  case 'sólido': state = 'solido'; break;
                  default: state = 'tocado';
                }
              }
              
              dbStats.total++;
              dbStats[state]++;
            }
          }
          
          hasMore = response.has_more;
          nextCursor = response.next_cursor;
          
          // Si no encontramos páginas en esta respuesta, salir para evitar bucle infinito
          if (pagesInThisDb.length === 0 && response.results.length > 0) {
            // Continuar buscando si hay más páginas pero ninguna de esta DB
            continue;
          } else if (pagesInThisDb.length === 0) {
            // No hay más páginas relevantes
            break;
          }
        }
        
        const endTime = Date.now();
        console.log(`✅ Base de datos ${dbId}: ${dbStats.total} tarjetas en ${endTime - startTime}ms`);
        return dbStats;
        
      } catch (error) {
        console.error(`❌ Error obteniendo estadísticas de base de datos ${dbId}:`, error.message);
        return { tocado: 0, verde: 0, solido: 0, total: 0 };
      }
    });
    
    // Esperar todas las estadísticas en paralelo
    const allDbStats = await Promise.all(statsPromises);
    
    // Sumar todas las estadísticas
    allDbStats.forEach(dbStats => {
      stats.tocado += dbStats.tocado;
      stats.verde += dbStats.verde;
      stats.solido += dbStats.solido;
      stats.total += dbStats.total;
    });
    
    console.log('📊 Estadísticas totales del grupo:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas del grupo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las agrupaciones
app.get('/groups', async (req, res) => {
  try {
    const groups = await DatabaseService.getDatabaseGroups();
    res.json(groups);
  } catch (error) {
    console.error('❌ Error obteniendo agrupaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva agrupación
app.post('/groups', async (req, res) => {
  try {
    const { name, color, databaseIds } = req.body;
    
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const group = await DatabaseService.createDatabaseGroup(
      name.trim(), 
      color || '#3B82F6', 
      databaseIds || []
    );
    
    console.log('✅ Agrupación creada:', group.name);
    res.status(201).json(group);
  } catch (error) {
    console.error('❌ Error creando agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar agrupación
app.put('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;
    
    await DatabaseService.updateDatabaseGroup(groupId, updates);
    
    console.log('✅ Agrupación actualizada:', groupId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error actualizando agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar agrupación
app.delete('/groups/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    await DatabaseService.deleteDatabaseGroup(groupId);
    
    console.log('✅ Agrupación eliminada:', groupId);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error eliminando agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener bases de datos de una agrupación
app.get('/groups/:groupId/databases', async (req, res) => {
  try {
    const { groupId } = req.params;
    const databases = await DatabaseService.getDatabasesInGroup(groupId);
    res.json(databases);
  } catch (error) {
    console.error('❌ Error obteniendo bases de datos de agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mover base de datos a carpeta
app.put('/groups/:groupId/databases/:databaseId/move-to-folder', async (req, res) => {
  try {
    const { groupId, databaseId } = req.params;
    const { folderId } = req.body;
    
    console.log('📁 Moviendo base de datos a carpeta:', { groupId, databaseId, folderId });
    
    await DatabaseService.moveDatabaseToFolder(groupId, databaseId, folderId);
    
    console.log('✅ Base de datos movida a carpeta');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error moviendo base de datos a carpeta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE CARPETAS DE AGRUPACIONES ====================

// Obtener carpetas de una agrupación específica
app.get('/groups/:groupId/group-folders', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('📁 Obteniendo carpetas de agrupación para grupo:', groupId);
    
    const folders = await DatabaseService.getGroupFoldersByGroup(groupId);
    
    console.log('✅ Carpetas obtenidas:', folders.length);
    res.json(folders);
  } catch (error) {
    console.error('❌ Error obteniendo carpetas de agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener todas las carpetas de agrupaciones (mantener para compatibilidad)
app.get('/group-folders', async (req, res) => {
  try {
    console.log('📁 Obteniendo todas las carpetas de agrupaciones');
    
    const folders = await DatabaseService.getGroupFolders();
    
    console.log('✅ Carpetas obtenidas:', folders.length);
    res.json(folders);
  } catch (error) {
    console.error('❌ Error obteniendo carpetas de agrupaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear carpeta de agrupaciones
app.post('/groups/:groupId/group-folders', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { folderName, color, icon, orderIndex } = req.body;
    
    if (!folderName || folderName.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre de la carpeta es requerido' });
    }
    
    console.log('📁 Creando carpeta de agrupación:', folderName, 'para grupo:', groupId);
    
    const folder = await DatabaseService.createGroupFolder(
      groupId,
      folderName.trim(),
      color || '#3B82F6',
      icon || '📁',
      orderIndex
    );
    
    console.log('✅ Carpeta de agrupación creada:', folder.id);
    res.status(201).json(folder);
  } catch (error) {
    console.error('❌ Error creando carpeta de agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar carpeta de agrupaciones
app.put('/group-folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const updates = req.body;
    
    console.log('📁 Actualizando carpeta de agrupaciones:', folderId);
    
    const updated = await DatabaseService.updateGroupFolder(folderId, updates);
    
    if (updated) {
      console.log('✅ Carpeta de agrupaciones actualizada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carpeta no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error actualizando carpeta de agrupaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar carpeta de agrupaciones
app.delete('/group-folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    console.log('📁 Eliminando carpeta de agrupaciones:', folderId);
    
    const deleted = await DatabaseService.deleteGroupFolder(folderId);
    
    if (deleted) {
      console.log('✅ Carpeta de agrupaciones eliminada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carpeta no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error eliminando carpeta de agrupaciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reordenar carpetas de agrupaciones
app.put('/groups/:groupId/group-folders/reorder', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { folderOrders } = req.body;
    
    if (!folderOrders || !Array.isArray(folderOrders)) {
      return res.status(400).json({ error: 'folderOrders es requerido y debe ser un array' });
    }
    
    console.log('📁 Reordenando carpetas de agrupación para grupo:', groupId);
    
    const reordered = await DatabaseService.reorderGroupFolders(groupId, folderOrders);
    
    if (reordered) {
      console.log('✅ Carpetas de agrupación reordenadas');
      res.json({ success: true });
    }
  } catch (error) {
    console.error('❌ Error reordenando carpetas de agrupación:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE METAS DE AGRUPACIONES ====================

console.log('🔧 DEBUG: Registrando endpoints de metas de agrupaciones...');

// Obtener metas de una agrupación
app.get('/groups/:groupId/goals', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('🎯 Obteniendo metas para grupo:', groupId);
    
    const goals = await DatabaseService.getGroupGoals(groupId);
    
    console.log('✅ Metas obtenidas:', goals.length);
    res.json(goals);
  } catch (error) {
    console.error('❌ Error obteniendo metas:', error);
    res.status(500).json({ error: error.message });
  }
});
console.log('✅ Endpoint GET /groups/:groupId/goals registrado');

// Obtener conteo de metas pendientes
app.get('/groups/:groupId/goals/pending-count', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('🎯 Obteniendo conteo de metas pendientes para grupo:', groupId);
    
    const count = await DatabaseService.getPendingGoalsCount(groupId);
    
    console.log('✅ Metas pendientes:', count);
    res.json({ pendingCount: count });
  } catch (error) {
    console.error('❌ Error obteniendo conteo de metas pendientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear meta de agrupación
app.post('/groups/:groupId/goals', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, description, dueDate } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'El título es requerido' });
    }
    
    console.log('🎯 Creando meta para grupo:', groupId);
    
    const goal = await DatabaseService.createGroupGoal(
      groupId,
      title.trim(),
      description,
      dueDate
    );
    
    console.log('✅ Meta creada:', goal.id);
    res.status(201).json(goal);
  } catch (error) {
    console.error('❌ Error creando meta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar meta de agrupación
app.put('/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    const updates = req.body;
    
    console.log('🎯 Actualizando meta:', goalId);
    
    await DatabaseService.updateGroupGoal(goalId, updates);
    
    console.log('✅ Meta actualizada');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error actualizando meta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar meta de agrupación
app.delete('/goals/:goalId', async (req, res) => {
  try {
    const { goalId } = req.params;
    
    console.log('🎯 Eliminando meta:', goalId);
    
    await DatabaseService.deleteGroupGoal(goalId);
    
    console.log('✅ Meta eliminada');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error eliminando meta:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE NOTAS Y ESTADÍSTICAS ====================

// Agregar nota de repaso
app.post('/flashcards/:flashcardId/notes', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { content, databaseId, sessionId } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El contenido de la nota es requerido' });
    }
    
    const note = await DatabaseService.addReviewNote(
      flashcardId, 
      databaseId, 
      content.trim(), 
      sessionId
    );
    
    // Registrar evento de estudio
    await DatabaseService.recordStudyEvent(
      databaseId, 
      flashcardId, 
      'note_added', 
      null, 
      sessionId
    );
    
    res.status(201).json(note);
  } catch (error) {
    console.error('❌ Error agregando nota:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener notas de una flashcard
app.get('/flashcards/:flashcardId/notes', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const notes = await DatabaseService.getReviewNotes(flashcardId);
    res.json(notes);
  } catch (error) {
    console.error('❌ Error obteniendo notas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Registrar evento de estudio
app.post('/study-events', async (req, res) => {
  try {
    const { databaseId, flashcardId, eventType, eventValue, sessionId } = req.body;
    
    await DatabaseService.recordStudyEvent(
      databaseId, 
      flashcardId, 
      eventType, 
      eventValue, 
      sessionId
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error registrando evento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para registrar sesión de estudio
app.post('/study-session', async (req, res) => {
  try {
    const { 
      flashcardId, 
      databaseId, 
      groupId, 
      previousState, 
      newState, 
      studyDurationSeconds, 
      reviewNotes 
    } = req.body;

    console.log('📊 Registrando sesión de estudio:', { flashcardId, previousState, newState });

    // Usar DatabaseService en lugar de pool directo
    await DatabaseService.recordStudySession(
      flashcardId,
      databaseId,
      groupId,
      previousState,
      newState,
      studyDurationSeconds || 0,
      reviewNotes || null
    );

    console.log('✅ Sesión de estudio registrada');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error registrando sesión de estudio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener estadísticas de estudio por período
app.get('/study-stats/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { period = 'day', offset = '0', databaseId } = req.query;

    console.log('📊 Obteniendo estadísticas de estudio:', { groupId, period, offset });

    const stats = await DatabaseService.getStudyStats(
      groupId,
      period,
      parseInt(offset) || 0,
      databaseId || null
    );

    console.log('✅ Estadísticas obtenidas:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas de estudio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener estadísticas globales (sin grupo específico)
app.get('/study-stats', async (req, res) => {
  try {
    const { period = 'day', offset = '0', databaseId } = req.query;

    console.log('📊 Obteniendo estadísticas globales:', { period, offset });

    const stats = await DatabaseService.getStudyStats(
      null,
      period,
      parseInt(offset) || 0,
      databaseId || null
    );

    console.log('✅ Estadísticas globales obtenidas:', stats);
    res.json(stats);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas globales:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener última fecha de estudio de un grupo
app.get('/last-study/:groupId', async (req, res) => {
  try {
    const { groupId } = req.params;

    const lastStudied = await DatabaseService.getLastStudyDate(groupId);
    res.json({ lastStudied });
  } catch (error) {
    console.error('❌ Error obteniendo última fecha de estudio:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener el número de veces que se ha repasado una flashcard
app.get('/flashcards/:flashcardId/review-count', async (req, res) => {
  try {
    const { flashcardId } = req.params;

    console.log('📊 Obteniendo conteo de repasos para flashcard:', flashcardId);

    const reviewCount = await DatabaseService.getFlashcardReviewCount(flashcardId);
    
    console.log('✅ Conteo de repasos obtenido:', reviewCount);
    res.json({ reviewCount });
  } catch (error) {
    console.error('❌ Error obteniendo conteo de repasos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para obtener conteos de notas de repaso por base de datos
app.get('/databases/:databaseId/notes-count', async (req, res) => {
  try {
    const { databaseId } = req.params;

    console.log('📊 Obteniendo conteos de notas para base de datos:', databaseId);

    const notesCounts = await DatabaseService.getNotesCountByDatabase(databaseId);
    
    console.log('✅ Conteos de notas obtenidos:', Object.keys(notesCounts).length, 'flashcards');
    res.json(notesCounts);
  } catch (error) {
    console.error('❌ Error obteniendo conteos de notas:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('🔧 DEBUG: Registrando endpoints de puntos de referencia...');

// TEST: Endpoint súper simple
app.get('/test-reference-endpoint', (req, res) => {
  console.log('🧪 TEST: Endpoint de prueba llamado');
  res.json({ message: 'Endpoint de prueba funciona' });
});

// ==================== ENDPOINTS DE PUNTOS DE REFERENCIA ====================

// Obtener puntos de referencia de una flashcard
app.get('/flashcards/:flashcardId/reference-points', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    console.log('📍 Obteniendo puntos de referencia para flashcard:', flashcardId);
    
    const referencePoints = await DatabaseService.getReferencePoints(flashcardId);
    
    console.log('✅ Puntos de referencia obtenidos:', referencePoints.length);
    res.json(referencePoints);
  } catch (error) {
    console.error('❌ Error obteniendo puntos de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nuevo punto de referencia
app.post('/flashcards/:flashcardId/reference-points', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { 
      selectedText, 
      referenceName, 
      databaseId, 
      textPosition, 
      blockId, 
      contextBefore, 
      contextAfter, 
      category, 
      color 
    } = req.body;
    
    if (!selectedText || selectedText.trim().length === 0) {
      return res.status(400).json({ error: 'El texto seleccionado es requerido' });
    }
    
    if (!referenceName || referenceName.trim().length === 0) {
      return res.status(400).json({ error: 'El nombre del punto de referencia es requerido' });
    }
    
    console.log('📍 Creando punto de referencia para flashcard:', flashcardId);
    
    const referencePoint = await DatabaseService.createReferencePoint(
      flashcardId,
      databaseId,
      selectedText.trim(),
      referenceName.trim(),
      {
        textPosition,
        blockId,
        contextBefore,
        contextAfter,
        category: category || 'general',
        color: color || '#3B82F6'
      }
    );
    
    console.log('✅ Punto de referencia creado:', referencePoint.id);
    res.status(201).json(referencePoint);
  } catch (error) {
    console.error('❌ Error creando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar punto de referencia
app.put('/reference-points/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    const updates = req.body;
    
    console.log('📍 Actualizando punto de referencia:', referenceId);
    
    const updated = await DatabaseService.updateReferencePoint(referenceId, updates);
    
    if (updated) {
      console.log('✅ Punto de referencia actualizado');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Punto de referencia no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error actualizando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar punto de referencia
app.delete('/reference-points/:referenceId', async (req, res) => {
  try {
    const { referenceId } = req.params;
    
    console.log('📍 Eliminando punto de referencia:', referenceId);
    
    const deleted = await DatabaseService.deleteReferencePoint(referenceId);
    
    if (deleted) {
      console.log('✅ Punto de referencia eliminado');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Punto de referencia no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error eliminando punto de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener conteo de puntos de referencia por base de datos
app.get('/databases/:databaseId/reference-points-count', async (req, res) => {
  try {
    const { databaseId } = req.params;
    
    console.log('📍 Obteniendo conteos de puntos de referencia para base de datos:', databaseId);
    
    const referencePointsCounts = await DatabaseService.getReferencePointsCountByDatabase(databaseId);
    
    console.log('✅ Conteos de puntos de referencia obtenidos:', Object.keys(referencePointsCounts).length, 'flashcards');
    res.json(referencePointsCounts);
  } catch (error) {
    console.error('❌ Error obteniendo conteos de puntos de referencia:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE PLANIFICACIÓN ====================

console.log('🔧 DEBUG: Registrando endpoints de planificación...');

// Test endpoint simple
app.get('/test-planning', (req, res) => {
  console.log('🧪 Test planning endpoint llamado');
  res.json({ message: 'Planning endpoints funcionando', timestamp: new Date().toISOString() });
});

// Obtener todas las sesiones de planificación de un grupo
app.get('/groups/:groupId/planning-sessions', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('📅 Obteniendo sesiones de planificación para grupo:', groupId);
    
    // Por ahora devolver array vacío hasta que funcione
    const sessions = [];
    
    console.log('✅ Sesiones de planificación obtenidas:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('❌ Error obteniendo sesiones de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear nueva sesión de planificación
app.post('/groups/:groupId/planning-sessions', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      sessionName, 
      databaseId, 
      sessionNote, 
      studyMode, 
      orderIndex 
    } = req.body;
    
    console.log('📅 Creando sesión de planificación para grupo:', groupId);
    
    // Por ahora devolver respuesta simulada
    const session = {
      id: 'temp-id',
      groupId,
      sessionName,
      databaseId,
      sessionNote: sessionNote || '',
      studyMode,
      orderIndex: orderIndex || 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('✅ Sesión de planificación creada:', session.id);
    res.status(201).json(session);
  } catch (error) {
    console.error('❌ Error creando sesión de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar orden de las sesiones de planificación
app.put('/groups/:groupId/planning-sessions/reorder', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { sessionOrders } = req.body; // Array de { sessionId, orderIndex }
    
    if (!Array.isArray(sessionOrders)) {
      return res.status(400).json({ error: 'sessionOrders debe ser un array' });
    }
    
    console.log('📅 Reordenando sesiones de planificación para grupo:', groupId);
    
    const updated = await DatabaseService.reorderPlanningSessions(groupId, sessionOrders);
    
    if (updated) {
      console.log('✅ Sesiones reordenadas correctamente');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'No se pudieron reordenar las sesiones' });
    }
  } catch (error) {
    console.error('❌ Error reordenando sesiones de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar sesión de planificación
app.put('/planning-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;
    
    console.log('📅 Actualizando sesión de planificación:', sessionId);
    
    const updated = await DatabaseService.updatePlanningSession(sessionId, updates);
    
    if (updated) {
      console.log('✅ Sesión de planificación actualizada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Sesión de planificación no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error actualizando sesión de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar sesión de planificación
app.delete('/planning-sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    console.log('📅 Eliminando sesión de planificación:', sessionId);
    
    const deleted = await DatabaseService.deletePlanningSession(sessionId);
    
    if (deleted) {
      console.log('✅ Sesión de planificación eliminada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Sesión de planificación no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error eliminando sesión de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENDPOINTS DE CARPETAS DE SESIONES ====================

// Obtener carpetas de un grupo
app.get('/groups/:groupId/session-folders', async (req, res) => {
  try {
    const { groupId } = req.params;
    console.log('📁 Obteniendo carpetas de sesiones para grupo:', groupId);
    
    const folders = await DatabaseService.getSessionFoldersByGroup(groupId);
    
    console.log('✅ Carpetas obtenidas:', folders.length);
    res.json(folders);
  } catch (error) {
    console.error('❌ Error obteniendo carpetas:', error);
    res.status(500).json({ error: error.message });
  }
});

// Crear carpeta
app.post('/groups/:groupId/session-folders', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { folderName, color, icon, orderIndex } = req.body;
    
    console.log('📁 Creando carpeta:', folderName);
    
    const folder = await DatabaseService.createSessionFolder(
      groupId,
      folderName,
      color,
      icon,
      orderIndex
    );
    
    console.log('✅ Carpeta creada:', folder.id);
    res.json(folder);
  } catch (error) {
    console.error('❌ Error creando carpeta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar carpeta
app.put('/session-folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const updates = req.body;
    
    console.log('📁 Actualizando carpeta:', folderId);
    
    const updated = await DatabaseService.updateSessionFolder(folderId, updates);
    
    if (updated) {
      console.log('✅ Carpeta actualizada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carpeta no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error actualizando carpeta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar carpeta
app.delete('/session-folders/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    
    console.log('📁 Eliminando carpeta:', folderId);
    
    const deleted = await DatabaseService.deleteSessionFolder(folderId);
    
    if (deleted) {
      console.log('✅ Carpeta eliminada');
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Carpeta no encontrada' });
    }
  } catch (error) {
    console.error('❌ Error eliminando carpeta:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reordenar carpetas
app.put('/groups/:groupId/session-folders/reorder', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { folderOrders } = req.body;
    
    console.log('📁 Reordenando carpetas del grupo:', groupId);
    
    const reordered = await DatabaseService.reorderSessionFolders(groupId, folderOrders);
    
    if (reordered) {
      console.log('✅ Carpetas reordenadas');
      res.json({ success: true });
    }
  } catch (error) {
    console.error('❌ Error reordenando carpetas:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Test API server running at http://localhost:${port}`);
});