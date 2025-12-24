const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');
const { initializeDatabase, DatabaseService } = require('./database.cjs');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

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

// Bases de datos - detección automática
app.get('/databases', async (req, res) => {
  try {
    console.log('🔍 Buscando todas las bases de datos compartidas...');
    
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
    res.json(databases);
  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener flashcards de una base de datos (SÚPER OPTIMIZADO)
app.get('/databases/:databaseId/flashcards', async (req, res) => {
  try {
    const { databaseId } = req.params;
    console.log('🚀 Obteniendo flashcards OPTIMIZADO para:', databaseId);
    
    const startTime = Date.now();
    const flashcards = [];
    let hasMore = true;
    let nextCursor = undefined;
    let totalProcessed = 0;
    
    // Usar el endpoint directo de la base de datos (MUCHO más rápido)
    while (hasMore) {
      console.log(`📄 Obteniendo página ${Math.floor(totalProcessed/100) + 1} de resultados...`);
      
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
        page.parent.database_id === databaseId
      );
      
      console.log(`📊 Páginas de esta base de datos en esta consulta: ${pagesInThisDb.length}`);
      
      // Procesar páginas en lotes pequeños para mejor rendimiento
      const batchSize = 10;
      for (let i = 0; i < pagesInThisDb.length; i += batchSize) {
        const batch = pagesInThisDb.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (page) => {
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

            // Conceptos relacionados (SIMPLIFICADO)
            let relatedConcepts = [];
            const relacionadosProperty = properties['Conceptos Relacionados'];
            if (relacionadosProperty && relacionadosProperty.type === 'multi_select') {
              relatedConcepts = relacionadosProperty.multi_select?.map((s) => s.name) || [];
            }

            // Solo propiedades esenciales para velocidad
            const auxiliaryInfo = {};
            const essentialProps = ['Fecha', 'Categoria', 'Tipo', 'Prioridad'];
            
            for (const propName of essentialProps) {
              const propValue = properties[propName];
              if (propValue) {
                let value = '';
                switch (propValue.type) {
                  case 'rich_text':
                    value = propValue.rich_text?.map((t) => t.plain_text).join('') || '';
                    break;
                  case 'select':
                    value = propValue.select?.name || '';
                    break;
                  case 'date':
                    if (propValue.date?.start) {
                      value = new Date(propValue.date.start).toLocaleDateString('es-ES');
                    }
                    break;
                }
                
                if (value && value.trim()) {
                  auxiliaryInfo[propName] = {
                    type: propValue.type,
                    value: value.trim()
                  };
                }
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
        flashcards.push(...batchResults.filter(card => card !== null));
        
        console.log(`📊 Procesado lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(pagesInThisDb.length/batchSize)}`);
      }
      
      totalProcessed += response.results.length;
      hasMore = response.has_more;
      nextCursor = response.next_cursor;
      
      // Límite de seguridad para velocidad
      if (flashcards.length >= 500) {
        console.log(`⚠️ Límite de 500 flashcards alcanzado para velocidad`);
        break;
      }
    }
    
    const endTime = Date.now();
    console.log(`🚀 OPTIMIZADO: ${flashcards.length} flashcards procesadas en ${endTime - startTime}ms`);
    console.log('📊 Estados:', {
      tocado: flashcards.filter(f => f.state === 'tocado').length,
      verde: flashcards.filter(f => f.state === 'verde').length,
      solido: flashcards.filter(f => f.state === 'solido').length,
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
  if (depth > 2) return []; // Limitar a 2 niveles de profundidad para evitar lentitud
  
  // Verificar cache primero
  const cacheKey = `${blockId}_${depth}`;
  if (blockChildrenCache.has(cacheKey)) {
    return blockChildrenCache.get(cacheKey);
  }
  
  try {
    console.log(`🔍 Obteniendo hijos del bloque ${blockId} (profundidad: ${depth})`);
    
    const children = await notion.blocks.children.list({
      block_id: blockId,
    });
    
    console.log(`📊 Hijos encontrados: ${children.results.length}`);
    console.log('🔍 Tipos de hijos:', children.results.map(c => c.type));
    
    const processedChildren = [];
    
    // Procesar solo los primeros 20 hijos para evitar lentitud
    const limitedChildren = children.results.slice(0, 20);
    
    for (const child of limitedChildren) {
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
    
    const blocks = await notion.blocks.children.list({
      block_id: flashcardId,
    });

    // Procesar bloques principales SIN obtener hijos (para velocidad)
    const processedBlocks = [];
    
    for (const block of blocks.results) {
      if ('type' in block) {
        const processedBlock = {
          id: block.id,
          type: block.type,
          content: null,
          hasChildren: block.has_children || false
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
          default:
            // Para tipos no reconocidos, intentar obtener rich_text genérico
            const richTextField = block[block.type]?.rich_text;
            if (richTextField) {
              processedBlock.content = { rich_text: richTextField };
            } else {
              processedBlock.content = { rich_text: [] };
            }
            break;
        }
        
        processedBlocks.push(processedBlock);
      }
    }
    
    const endTime = Date.now();
    console.log(`✅ Contenido principal obtenido en ${endTime - startTime}ms, bloques:`, processedBlocks.length);
    
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
    
    // Responder inmediatamente al cliente
    res.json({ 
      success: true, 
      updated: ['Dominio']
    });
    
    // Actualizar en Notion de forma asíncrona (no bloquear la respuesta)
    setImmediate(async () => {
      try {
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
        
        console.log('✅ Estado actualizado en Notion (async)');
        
        // Invalidar cache para esta página
        pagePropertiesCache.delete(flashcardId);
      } catch (error) {
        console.error('❌ Error actualizando estado en Notion (async):', error);
      }
    });
    
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
    
    // Procesar bases de datos en paralelo usando el endpoint directo (MUY rápido)
    const statsPromises = group.databaseIds.map(async (dbId) => {
      try {
        console.log('📊 Procesando estadísticas de base de datos:', dbId);
        const startTime = Date.now();
        
        let dbStats = { tocado: 0, verde: 0, solido: 0, total: 0 };
        let hasMore = true;
        let nextCursor = undefined;
        
        // Usar el endpoint que sabemos que funciona pero optimizado
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
          
          // Solo procesar 1 página por DB para velocidad extrema
          break;
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

app.listen(port, () => {
  console.log(`🚀 Test API server running at http://localhost:${port}`);
});