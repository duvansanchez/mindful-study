import { Client } from '@notionhq/client';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const notion = new Client({ 
  auth: process.env.VITE_NOTION_TOKEN 
});

const retrieveNotionDatabase = async (databaseId) => {
  if (notion.databases?.retrieve) {
    return notion.databases.retrieve({ database_id: databaseId });
  }

  if (notion.dataSources?.retrieve) {
    return notion.dataSources.retrieve({ data_source_id: databaseId });
  }

  throw new Error('Notion SDK no soporta retrieve de databases ni dataSources');
};

const queryNotionDatabase = async (databaseId, pageSize = 100, startCursor) => {
  if (notion.databases?.query) {
    return notion.databases.query({
      database_id: databaseId,
      page_size: pageSize,
      start_cursor: startCursor,
    });
  }

  if (notion.dataSources?.query) {
    return notion.dataSources.query({
      data_source_id: databaseId,
      page_size: pageSize,
      start_cursor: startCursor,
    });
  }

  throw new Error('Notion SDK no soporta query de databases ni dataSources');
};

// Mapeo de estados de conocimiento
const mapNotionStateToKnowledgeState = (notionState) => {
  switch (notionState?.toLowerCase()) {
    case 'tocado':
    case 'touched':
      return 'tocado';
    case 'verde':
    case 'green':
      return 'verde';
    case 'solido':
    case 'solid':
      return 'solido';
    default:
      return 'tocado';
  }
};

// Obtener títulos de páginas relacionadas
const getRelatedPageTitles = async (relationIds) => {
  if (!relationIds || relationIds.length === 0) return [];
  
  try {
    const titles = [];
    for (const id of relationIds) {
      try {
        const page = await notion.pages.retrieve({ page_id: id });
        if (page.properties) {
          const titleProperty = Object.values(page.properties).find((prop) => prop.type === 'title');
          const title = titleProperty ? extractTextFromProperty(titleProperty) : 'Sin título';
          titles.push({ id, title });
        }
      } catch (error) {
        console.error(`Error obteniendo página relacionada ${id}:`, error.message);
        titles.push({ id, title: `Error: ${id}` });
      }
    }
    return titles;
  } catch (error) {
    console.error('Error obteniendo títulos de páginas relacionadas:', error);
    return [];
  }
};

// Extraer texto de propiedades de Notion
const extractTextFromProperty = (property) => {
  if (!property) return '';
  
  switch (property.type) {
    case 'title':
      return property.title?.map((t) => t.plain_text).join('') || '';
    case 'rich_text':
      return property.rich_text?.map((t) => t.plain_text).join('') || '';
    case 'select':
      return property.select?.name || '';
    case 'multi_select':
      return property.multi_select?.map((s) => s.name).join(', ') || '';
    case 'date':
      return property.date?.start || '';
    case 'number':
      return property.number?.toString() || '';
    case 'checkbox':
      return property.checkbox ? 'Sí' : 'No';
    case 'url':
      return property.url || '';
    case 'email':
      return property.email || '';
    case 'phone_number':
      return property.phone_number || '';
    case 'relation':
      // Para relaciones, devolvemos los IDs de las páginas relacionadas
      return property.relation?.map((rel) => rel.id).join(', ') || '';
    default:
      return '';
  }
};

// Obtener contenido completo de una página
const getPageContent = async (pageId) => {
  try {
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
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
          case 'code':
            content += '```\n' + (block.code?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n```\n\n';
            break;
          case 'quote':
            content += '> ' + (block.quote?.rich_text?.map((t) => t.plain_text).join('') || '') + '\n\n';
            break;
        }
      }
    }

    return content.trim();
  } catch (error) {
    console.error('Error fetching page content:', error);
    return '';
  }
};

// Rutas de la API

// Test de conexión
app.get('/test', async (req, res) => {
  try {
    const response = await notion.users.me();
    res.json({ success: true, user: response });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Obtener bases de datos
app.get('/databases', async (req, res) => {
  try {
    console.log('🔍 Buscando páginas para encontrar bases de datos...');
    
    const response = await notion.search({
      query: '',
      page_size: 100,
    });

    console.log('📊 Resultados de búsqueda:', response.results.length);

    // Debug: ver estructura de las páginas
    response.results.forEach((item, index) => {
      if (item.object === 'page') {
        console.log(`📄 Página ${index + 1}:`, {
          id: item.id,
          parent: item.parent,
          hasProperties: !!item.properties
        });
      }
    });

    const databaseIds = new Set();
    const databases = [];
    
    // Buscar páginas que pertenezcan a bases de datos
    for (const item of response.results) {
      if (item.object === 'page' && item.parent) {
        console.log('🔍 Analizando parent:', item.parent);
        
        // Verificar diferentes formatos de parent
        let databaseId = null;
        if (item.parent.type === 'database_id') {
          databaseId = item.parent.database_id;
          console.log('✅ Encontrado database_id (tipo database_id):', databaseId);
        } else if (item.parent.type === 'data_source_id' && item.parent.database_id) {
          databaseId = item.parent.database_id;
          console.log('✅ Encontrado database_id (tipo data_source_id):', databaseId);
        } else if (item.parent.database_id) {
          databaseId = item.parent.database_id;
          console.log('✅ Encontrado database_id (directo):', databaseId);
        }
        
        console.log('🔍 Database ID extraído:', databaseId);
        console.log('🔍 Ya existe en Set?:', databaseIds.has(databaseId));
        
        if (databaseId && !databaseIds.has(databaseId)) {
          databaseIds.add(databaseId);
          
          try {
            console.log('🔍 Obteniendo info de base de datos:', databaseId);
            const database = await retrieveNotionDatabase(databaseId);
            
            const title = database.title?.[0]?.plain_text || 'Sin título';
            const icon = database.icon?.emoji || '📄';
            
            // Obtener el conteo real de páginas en la base de datos
            const pagesResponse = await queryNotionDatabase(databaseId, 100);
            
            console.log('✅ Base de datos encontrada:', title, 'con', pagesResponse.results.length, 'páginas');
            
            databases.push({
              id: database.id,
              name: title,
              icon: icon,
              cardCount: pagesResponse.results.length,
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
    console.error('❌ Error fetching databases:', error);
    console.error('❌ Error details:', error.body || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Obtener información de propiedades de una base de datos
app.get('/databases/:databaseId/properties', async (req, res) => {
  try {
    const { databaseId } = req.params;
    console.log('🔍 Obteniendo propiedades para base de datos:', databaseId);
    
    const database = await retrieveNotionDatabase(databaseId);
    
    const properties = {};
    
    for (const [key, prop] of Object.entries(database.properties)) {
      properties[key] = {
        name: key,
        type: prop.type,
        id: prop.id
      };
      
      // Información adicional según el tipo
      switch (prop.type) {
        case 'relation':
          properties[key].relation = {
            database_id: prop.relation?.database_id,
            type: prop.relation?.type || 'single_property'
          };
          break;
        case 'select':
          properties[key].options = prop.select?.options || [];
          break;
        case 'multi_select':
          properties[key].options = prop.multi_select?.options || [];
          break;
      }
    }
    
    console.log('📊 Propiedades encontradas:', Object.keys(properties).length);
    console.log('🔗 Propiedades de relación:', Object.values(properties).filter(p => p.type === 'relation').length);
    
    res.json(properties);
  } catch (error) {
    console.error('❌ Error fetching database properties:', error);
    res.status(500).json({ error: error.message });
  }
});

// Obtener flashcards de una base de datos
app.get('/databases/:databaseId/flashcards', async (req, res) => {
  try {
    const { databaseId } = req.params;
    console.log('🔍 Obteniendo flashcards para base de datos:', databaseId);
    
    // Usar la API específica de databases.query en lugar de search
    const response = await queryNotionDatabase(databaseId, 100);

    console.log('📊 Páginas encontradas en la base de datos:', response.results.length);

    const flashcards = [];

    for (const page of response.results) {
      console.log('🔍 Procesando página:', {
        id: page.id,
        hasProperties: !!page.properties,
        propertyKeys: page.properties ? Object.keys(page.properties) : []
      });

      if (page.properties) {
        const properties = page.properties;

        // Buscar la propiedad de título (normalmente "Nombre" en español)
        const titleProperty = Object.values(properties).find((prop) => prop.type === 'title');
        const title = titleProperty ? extractTextFromProperty(titleProperty) : 'Sin título';
        
        console.log('📝 Título encontrado:', title);

        // Buscar propiedad de estado (puede llamarse "Estado", "Tipo concepto", etc.)
        const stateProperty = Object.values(properties).find((prop) => 
          prop.type === 'select' && 
          ['estado', 'state', 'status', 'knowledge_state', 'tipo_concepto', 'tipo concepto'].includes(
            Object.keys(properties).find(key => properties[key] === prop)?.toLowerCase().replace(/\s+/g, '_') || ''
          )
        );
        
        let state = 'tocado'; // Estado por defecto
        if (stateProperty) {
          state = mapNotionStateToKnowledgeState(stateProperty.select?.name || '');
          console.log('🏷️ Estado encontrado:', stateProperty.select?.name, '→', state);
        } else {
          console.log('⚠️ No se encontró propiedad de estado');
        }

        // Buscar propiedad de notas
        const notesProperty = Object.values(properties).find((prop) => 
          prop.type === 'rich_text' && 
          ['notas', 'notes', 'observaciones', 'nota_propia', 'nota propia'].includes(
            Object.keys(properties).find(key => properties[key] === prop)?.toLowerCase().replace(/\s+/g, '_') || ''
          )
        );
        
        const notes = notesProperty ? extractTextFromProperty(notesProperty) : '';

        // Buscar conceptos relacionados (multi_select) - mantenemos por compatibilidad
        const relatedProperty = Object.values(properties).find((prop) => 
          prop.type === 'multi_select' && 
          ['relacionados', 'related', 'conceptos', 'tags', 'conceptos_relacionados', 'conceptos relacionados'].includes(
            Object.keys(properties).find(key => properties[key] === prop)?.toLowerCase().replace(/\s+/g, '_') || ''
          )
        );
        
        const relatedConcepts = relatedProperty && relatedProperty.multi_select ? 
          relatedProperty.multi_select.map((s) => s.name) : [];

        // Procesar TODAS las propiedades como información adicional
        const additionalInfo = {};
        
        console.log('📋 Procesando todas las propiedades como información adicional...');
        
        for (const [key, prop] of Object.entries(properties)) {
          // Solo saltar la propiedad de título (ya se usa como título principal)
          if (prop.type === 'title') continue;
          
          // Procesar la propiedad según su tipo
          let value = '';
          let displayValue = '';
          
          if (prop.type === 'relation') {
            if (prop.relation && prop.relation.length > 0) {
              console.log(`🔗 Procesando relación "${key}" con ${prop.relation.length} elementos`);
              const relationIds = prop.relation.map(rel => rel.id);
              const relatedTitles = await getRelatedPageTitles(relationIds);
              value = relationIds;
              displayValue = relatedTitles.map(r => r.title).join(', ');
              console.log(`✅ Relación "${key}" procesada:`, displayValue);
            } else {
              value = [];
              displayValue = '';
            }
          } else {
            value = extractTextFromProperty(prop);
            displayValue = value;
          }
          
          // Agregar TODAS las propiedades, incluso si están vacías (para debug)
          additionalInfo[key] = {
            type: prop.type,
            value: value,
            displayValue: displayValue
          };
          
          console.log(`📋 Propiedad "${key}" (${prop.type}): "${displayValue}"`);
        }

        // Obtener contenido completo de la página
        console.log('📄 Obteniendo contenido de la página...');
        const content = await getPageContent(page.id);
        console.log('📄 Contenido obtenido, longitud:', content.length);

        const flashcard = {
          id: page.id,
          title,
          content: content || 'Sin contenido disponible',
          state,
          lastReviewed: null,
          notes,
          relatedConcepts,
          additionalInfo, // Todas las propiedades adicionales (incluyendo relaciones)
          databaseId,
          createdAt: new Date(page.created_time),
          viewCount: 0,
          reviewNotes: [],
        };

        console.log('✅ Flashcard creada:', { 
          title, 
          state, 
          contentLength: content.length,
          additionalPropsCount: Object.keys(additionalInfo).length 
        });
        flashcards.push(flashcard);
      }
    }

    console.log('📊 Total flashcards creadas:', flashcards.length);
    res.json(flashcards);
  } catch (error) {
    console.error('❌ Error fetching flashcards:', error);
    console.error('❌ Error details:', error.body || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado de flashcard
app.put('/flashcards/:flashcardId/state', async (req, res) => {
  try {
    const { flashcardId } = req.params;
    const { newState } = req.body;

    const page = await notion.pages.retrieve({ page_id: flashcardId });
    
    if (page.properties) {
      const properties = page.properties;
      
      const statePropertyKey = Object.keys(properties).find(key => 
        properties[key].type === 'select' && 
        ['estado', 'state', 'status', 'knowledge_state'].includes(key.toLowerCase())
      );

      if (statePropertyKey) {
        await notion.pages.update({
          page_id: flashcardId,
          properties: {
            [statePropertyKey]: {
              select: {
                name: newState,
              },
            },
          },
        });
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'No state property found' });
      }
    } else {
      res.status(400).json({ error: 'No properties found' });
    }
  } catch (error) {
    console.error('Error updating flashcard state:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Notion API server running at http://localhost:${port}`);
});