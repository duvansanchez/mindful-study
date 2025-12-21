const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3002;

app.use(cors());
app.use(express.json());

const notion = new Client({ 
  auth: process.env.VITE_NOTION_TOKEN 
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

    for (const page of pagesInDb) {
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
          console.log('🏷️ Dominio encontrado para', title, ':', dominioValue);
          
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
            // Si es una relación, obtener los títulos de las páginas relacionadas
            for (const rel of relacionadosProperty.relation) {
              try {
                const relatedPage = await notion.pages.retrieve({ page_id: rel.id });
                if (relatedPage.properties) {
                  const titleProp = Object.values(relatedPage.properties).find((p) => p.type === 'title');
                  if (titleProp && titleProp.type === 'title') {
                    const title = titleProp.title?.map((t) => t.plain_text).join('') || 'Sin título';
                    relatedConcepts.push(title);
                  }
                }
              } catch (relError) {
                console.error('❌ Error obteniendo concepto relacionado:', relError.message);
                relatedConcepts.push('Concepto no disponible');
              }
            }
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
                // Obtener los títulos de las páginas relacionadas
                const relationTitles = [];
                for (const rel of propValue.relation) {
                  try {
                    const relatedPage = await notion.pages.retrieve({ page_id: rel.id });
                    if (relatedPage.properties) {
                      const titleProp = Object.values(relatedPage.properties).find((p) => p.type === 'title');
                      if (titleProp && titleProp.type === 'title') {
                        const title = titleProp.title?.map((t) => t.plain_text).join('') || 'Sin título';
                        relationTitles.push(title);
                      }
                    }
                  } catch (relError) {
                    console.error('❌ Error obteniendo página relacionada:', relError.message);
                    relationTitles.push('Relación no disponible');
                  }
                }
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

        console.log('📋 Propiedades auxiliares para', title, ':', Object.keys(auxiliaryInfo));

        // Obtener contenido de la página
        let content = 'Sin contenido disponible';
        try {
          const blocks = await notion.blocks.children.list({
            block_id: page.id,
          });

          content = '';
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
          content = content.trim() || 'Sin contenido disponible';
        } catch (contentError) {
          console.error('Error obteniendo contenido:', contentError.message);
        }

        console.log('✅ Flashcard creada:', { title, state, contentLength: content.length });

        flashcards.push({
          id: page.id,
          title,
          content,
          state,
          lastReviewed: null,
          notes,
          relatedConcepts,
          auxiliaryInfo, // Nueva propiedad con todas las columnas adicionales
          databaseId,
          createdAt: new Date(page.created_time),
          viewCount: 0,
          reviewNotes: [],
        });
      }
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

// Actualizar estado de flashcard (placeholder)
app.put('/flashcards/:flashcardId/state', async (req, res) => {
  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`🚀 Test API server running at http://localhost:${port}`);
});