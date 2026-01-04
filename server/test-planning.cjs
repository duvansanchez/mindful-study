const express = require('express');
const cors = require('cors');

const app = express();
const port = 3003;

app.use(cors());
app.use(express.json());

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
    
    // Por ahora devolver array vacío
    const sessions = [];
    
    console.log('✅ Sesiones de planificación obtenidas:', sessions.length);
    res.json(sessions);
  } catch (error) {
    console.error('❌ Error obteniendo sesiones de planificación:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 Planning API server running at http://localhost:${port}`);
});