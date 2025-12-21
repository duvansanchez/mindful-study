const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const notion = new Client({ 
  auth: process.env.VITE_NOTION_TOKEN 
});

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

// Obtener bases de datos - versión simplificada
app.get('/databases', async (req, res) => {
  try {
    console.log('🔍 Buscando bases de datos...');
    
    // Sabemos que tu base de datos existe, vamos a devolverla directamente
    const databaseId = '2c576585-c8ed-8120-961b-e9ad0498e162';
    
    try {
      const database = await notion.databases.retrieve({ database_id: databaseId });
      const title = database.title?.[0]?.plain_text || 'Conceptos - Terminos de Advanced IT Support';
      const icon = database.icon?.emoji || '📄';
      
      // Obtener conteo de páginas
      const pagesResponse = await notion.databases.query({
        database_id: databaseId,
        page_size: 100,
      });
      
      const databases = [{
        id: database.id,
        name: title,
        icon: icon,
        cardCount: pagesResponse.results.length,
        lastSynced: new Date(database.last_edited_time),
        source: 'notion',
      }];
      
      console.log('✅ Base de datos encontrada:', title, 'con', pagesResponse.results.length, 'páginas');
      res.json(databases);
    } catch (error) {
      console.error('❌ Error obteniendo base de datos:', error.message);
      res.json([]);
    }
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
    
    const response = await notion.databases.query({
      database_id: databaseId,
      page_size: 100,
    });

    const flashcards = [];

    for (const page of response.results) {
      if (page.properties) {
        const properties = page.properties;

        // Buscar título
        const titleProperty = Object.values(properties).find((prop) => prop.type === 'title');
        const title = titleProperty ? 
          titleProperty.title?.map((t) => t.plain_text).join('') || 'Sin título' : 'Sin título';

        // Estado por defecto
        const state = 'tocado';

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

        flashcards.push({
          id: page.id,
          title,
          content,
          state,
          lastReviewed: null,
          notes: '',
          relatedConcepts: [],
          databaseId,
          createdAt: new Date(page.created_time),
          viewCount: 0,
          reviewNotes: [],
        });
      }
    }

    console.log('📊 Total flashcards:', flashcards.length);
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
  console.log(`🚀 Notion API server running at http://localhost:${port}`);
});