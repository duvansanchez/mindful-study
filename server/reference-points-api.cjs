const express = require('express');
const { DatabaseService } = require('./database.cjs');

const router = express.Router();

// Obtener puntos de referencia de una flashcard
router.get('/flashcards/:flashcardId/reference-points', async (req, res) => {
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
router.post('/flashcards/:flashcardId/reference-points', async (req, res) => {
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
router.put('/reference-points/:referenceId', async (req, res) => {
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
router.delete('/reference-points/:referenceId', async (req, res) => {
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
router.get('/databases/:databaseId/reference-points-count', async (req, res) => {
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

module.exports = router;