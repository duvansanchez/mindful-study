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

// Bases de datos hardcodeadas
app.get('/databases', (req, res) => {
  console.log('🔍 Endpoint /databases llamado');
  
  const databases = [{
    id: '2c576585-c8ed-8120-961b-e9ad0498e162',
    name: 'Conceptos - Terminos de Advanced IT Support',
    icon: '📄',
    cardCount: 16,
    lastSynced: new Date().toISOString(),
    source: 'notion',
  }];
  
  console.log('📊 Devolviendo', databases.length, 'bases de datos');
  res.json(databases);
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
        if (relacionadosProperty && relacionadosProperty.type === 'multi_select') {
          relatedConcepts = relacionadosProperty.multi_select?.map((s) => s.name) || [];
        }

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