const { Client } = require('@notionhq/client');
const express = require('express');
const cors = require('cors');
const { initializeDatabase, DatabaseService } = require('./database.cjs');
require('dotenv').config();

const app = express();
const port = 3003; // Puerto diferente para evitar conflictos

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
app.get('/test', (req, res) => {
  res.json({ message: 'Servidor de prueba funcionando', timestamp: new Date().toISOString() });
});

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

app.listen(port, () => {
  console.log(`🚀 Servidor de prueba de puntos de referencia ejecutándose en http://localhost:${port}`);
});