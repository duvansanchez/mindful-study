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

// Bases de datos - detección automática
app.get('/databases', async (req, res) => {
  try {
    console.log('🔍 Buscando todas las bases de datos compartidas...');
    
    // Buscar todas las páginas para encontrar bases de datos
    const response = await notion.search({
      query: '',
      page_size: 100,
    });

    console.log('📊 Resultados de búsqueda:', response.results.length);

    const databaseIds = new Set();
    const databases = [];
    
    // Buscar páginas que pertenezcan a bases de datos
    for (const item of response.results) {
      if (item.object === 'page' && item.parent) {
        // Verificar diferentes formatos de parent
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
        }
        
        if (databaseId && !databaseIds.has(databaseId)) {
          databaseIds.add(databaseId);
          
          try {
            console.log('🔍 Obteniendo info de base de datos:', databaseId);
            const database = await notion.databases.retrieve({ database_id: databaseId });
            
            const title = database.title?.[0]?.plain_text || 'Sin título';
            const icon = database.icon?.emoji || '📄';
            
            // Obtener conteo real de páginas usando search
            const pagesInDb = response.results.filter((page) => 
              page.object === 'page' &&
              page.parent && 
              page.parent.database_id === databaseId
            );
            
            console.log('✅ Base de datos encontrada:', title, 'con', pagesInDb.length, 'páginas');
            
            databases.push({
              id: database.id,
              name: title,
              icon: icon,
              cardCount: pagesInDb.length,
              lastSynced: new Date(database.last_edited_time),
              source: 'notion',
            });
          } catch (dbError) {
            console.error('❌ Error obteniendo base de datos:', databaseId, dbError.message);
          }
        }
      }
    }

    console.log('📊 Total bases de datos encontradas:', databases.length);
    res.json(databases);
  } catch (error) {
    console.error('❌ Error general:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener flashcards de una base de datos
app.get('/databases/:databaseId/flashcards', async (req, res) => {
  try {
    const { databaseId } = req.params;
    console.log('🔍 Obteniendo flashcards para:', databaseId);
    
    // Usar search en lugar de databases.query
    const response = await notion.search({
      query: '',
      page_size: 100,
    });

    console.log('📊 Resultados de búsqueda:', response.results.length);

    // Filtrar páginas que pertenecen a esta base de datos
    const pagesInDb = response.results.filter((page) => 
      page.object === 'page' &&
      page.parent && 
      page.parent.database_id === databaseId
    );

    console.log('📊 Páginas en la base de datos:', pagesInDb.length);

    const flashcards = [];
    
    // Cache para páginas relacionadas para evitar llamadas duplicadas
    const relatedPagesCache = new Map();

    // Función helper para obtener título de página relacionada con caché
    const getRelatedPageTitle = async (pageId) => {
      if (relatedPagesCache.has(pageId)) {
        return relatedPagesCache.get(pageId);
      }
      
      try {
        const relatedPage = await notion.pages.retrieve({ page_id: pageId });
        if (relatedPage.properties) {
          const titleProp = Object.values(relatedPage.properties).find((p) => p.type === 'title');
          if (titleProp && titleProp.type === 'title') {
            const title = titleProp.title?.map((t) => t.plain_text).join('') || 'Sin título';
            relatedPagesCache.set(pageId, title);
            return title;
          }
        }
      } catch (error) {
        console.error('❌ Error obteniendo página relacionada:', error.message);
      }
      
      const fallback = 'Relación no disponible';
      relatedPagesCache.set(pageId, fallback);
      return fallback;
    };

    // Procesar páginas en lotes para mejorar rendimiento
    const batchSize = 5;
    for (let i = 0; i < pagesInDb.length; i += batchSize) {
      const batch = pagesInDb.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (page) => {
        if (page.properties) {
          const properties = page.properties;

          // Buscar título (columna "Nombre")
          const titleProperty = Object.values(properties).find((prop) => prop.type === 'title');
          const title = titleProperty ? 
            titleProperty.title?.map((t) => t.plain_text).join('') || 'Sin título' : 'Sin título';

          // Buscar estado en la columna "Dominio"
          let state = 'tocado'; // Estado por defecto
          const dominioProperty = properties['Dominio'];
          if (dominioProperty && dominioProperty.type === 'select' && dominioProperty.select) {
            const dominioValue = dominioProperty.select.name;
            
            // Mapear el valor de Dominio a nuestros estados
            switch (dominioValue?.toLowerCase()) {
              case 'tocado':
                state = 'tocado';
                break;
              case 'verde':
                state = 'verde';
                break;
              case 'solido':
              case 'sólido':
                state = 'solido';
                break;
              default:
                state = 'tocado';
            }
          }

          // Buscar notas en "Nota Propia"
          let notes = '';
          const notaProperty = properties['Nota Propia'];
          if (notaProperty && notaProperty.type === 'rich_text') {
            notes = notaProperty.rich_text?.map((t) => t.plain_text).join('') || '';
          }

          // Buscar conceptos relacionados en "Conceptos Relacionados"
          let relatedConcepts = [];
          const relacionadosProperty = properties['Conceptos Relacionados'];
          if (relacionadosProperty) {
            if (relacionadosProperty.type === 'multi_select') {
              relatedConcepts = relacionadosProperty.multi_select?.map((s) => s.name) || [];
            } else if (relacionadosProperty.type === 'relation' && relacionadosProperty.relation?.length > 0) {
              // Procesar relaciones en paralelo
              const relationPromises = relacionadosProperty.relation.map(rel => getRelatedPageTitle(rel.id));
              relatedConcepts = await Promise.all(relationPromises);
            }
          }

          // Extraer todas las propiedades adicionales para información auxiliar
          const auxiliaryInfo = {};
          for (const [propName, propValue] of Object.entries(properties)) {
            // Saltar propiedades que ya procesamos
            if (['Nombre', 'Dominio', 'Nota Propia', 'Conceptos Relacionados'].includes(propName)) {
              continue;
            }
            
            // Saltar la propiedad de título
            if (propValue.type === 'title') {
              continue;
            }

            // Extraer valor según el tipo de propiedad
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
              case 'people':
                value = propValue.people?.map((p) => p.name || 'Usuario').join(', ') || '';
                break;
              case 'files':
                value = propValue.files?.map((f) => f.name || 'Archivo').join(', ') || '';
                break;
              case 'relation':
                if (propValue.relation && propValue.relation.length > 0) {
                  // Procesar relaciones en paralelo con caché
                  const relationPromises = propValue.relation.map(rel => getRelatedPageTitle(rel.id));
                  const relationTitles = await Promise.all(relationPromises);
                  value = relationTitles.join(', ');
                } else {
                  value = 'Sin relaciones configuradas';
                }
                break;
              case 'formula':
                if (propValue.formula?.string) value = propValue.formula.string;
                else if (propValue.formula?.number) value = propValue.formula.number.toString();
                else if (propValue.formula?.boolean !== undefined) value = propValue.formula.boolean ? 'Sí' : 'No';
                else if (propValue.formula?.date?.start) value = new Date(propValue.formula.date.start).toLocaleDateString('es-ES');
                break;
              case 'rollup':
                if (propValue.rollup?.array) {
                  value = propValue.rollup.array.length ? `${propValue.rollup.array.length} elemento(s)` : '';
                } else if (propValue.rollup?.number) {
                  value = propValue.rollup.number.toString();
                }
                break;
              case 'created_time':
                value = new Date(propValue.created_time).toLocaleDateString('es-ES');
                break;
              case 'created_by':
                value = propValue.created_by?.name || 'Usuario';
                break;
              case 'last_edited_time':
                value = new Date(propValue.last_edited_time).toLocaleDateString('es-ES');
                break;
              case 'last_edited_by':
                value = propValue.last_edited_by?.name || 'Usuario';
                break;
            }

            // Solo añadir si tiene valor
            if (value && value.trim()) {
              auxiliaryInfo[propName] = {
                type: propValue.type,
                value: value.trim()
              };
            }
          }

          // Obtener contenido de la página de forma más eficiente
          // OPTIMIZACIÓN: Solo obtener contenido cuando sea realmente necesario
          // Por ahora, usar el título como contenido para mejorar velocidad
          let content = title || 'Sin contenido disponible';
          
          // TODO: Implementar carga lazy del contenido cuando se abra la flashcard
          // try {
          //   const blocks = await notion.blocks.children.list({
          //     block_id: page.id,
          //     page_size: 3 // Solo los primeros 3 bloques
          //   });
          //   // ... procesar bloques
          // } catch (contentError) {
          //   console.error('Error obteniendo contenido:', contentError.message);
          // }

          return {
            id: page.id,
            title,
            content,
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

      // Esperar a que termine el lote actual antes de continuar
      const batchResults = await Promise.all(batchPromises);
      flashcards.push(...batchResults.filter(card => card !== null));
      
      console.log(`📊 Procesado lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(pagesInDb.length/batchSize)}`);
    }

    console.log('📊 Total flashcards:', flashcards.length);
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

// Obtener contenido detallado de una flashcard específica
app.get('/flashcards/:flashcardId/content', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    console.log('🔍 Obteniendo contenido detallado para flashcard:', flashcardId);
    
    const blocks = await notion.blocks.children.list({
      block_id: flashcardId,
    });

    let content = '';
    for (const block of blocks.results) {
      if ('type' in block) {
        switch (block.type) {
          case 'paragraph':
            content += block.paragraph?.rich_text?.map((t) => t.plain_text).join('') + '\n\n';
            break;
          case 'heading_1':
            content += '# ' + (block.heading_1?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n\n';
            break;
          case 'heading_2':
            content += '## ' + (block.heading_2?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n\n';
            break;
          case 'heading_3':
            content += '### ' + (block.heading_3?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n\n';
            break;
          case 'bulleted_list_item':
            content += '- ' + (block.bulleted_list_item?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n';
            break;
          case 'numbered_list_item':
            content += '1. ' + (block.numbered_list_item?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n';
            break;
        }
      }
    }
    
    const finalContent = content.trim() || 'Sin contenido disponible';
    console.log('✅ Contenido obtenido, longitud:', finalContent.length);
    
    res.json({ content: finalContent });
  } catch (error) {
    console.error('❌ Error fetching flashcard content:', error);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de flashcard (placeholder)
app.put('/flashcards/:flashcardId/state', async (req, res) => {
  res.json({ success: true });
});

// ==================== ENDPOINTS DE AGRUPACIONES ====================

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