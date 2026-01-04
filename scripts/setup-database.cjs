const fs = require('fs');
const path = require('path');
const sql = require('mssql');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
};

// Agregar autenticación
if (process.env.DB_USER && process.env.DB_PASSWORD) {
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
} else {
  // Usar Windows Authentication (integrated security)
  dbConfig.options.trustedConnection = true;
}

async function setupDatabase() {
  console.log('🚀 Iniciando configuración de base de datos...');
  
  try {
    // Conectar a SQL Server (sin especificar base de datos)
    console.log('📡 Conectando a SQL Server...');
    const pool = await sql.connect(dbConfig);
    
    // Leer y ejecutar scripts SQL
    const scriptsDir = path.join(__dirname, '..', 'database');
    const scripts = [
      'create_database.sql',
      'create_tables.sql',
      'create_planning_session.sql',
      'seed_data.sql'
    ];
    
    for (const scriptFile of scripts) {
      const scriptPath = path.join(scriptsDir, scriptFile);
      
      if (fs.existsSync(scriptPath)) {
        console.log(`📄 Ejecutando ${scriptFile}...`);
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');
        
        // Dividir por GO statements y ejecutar cada batch
        const batches = scriptContent
          .split(/^\s*GO\s*$/gim)
          .map(batch => batch.trim())
          .filter(batch => batch.length > 0);
        
        for (const batch of batches) {
          if (batch.trim()) {
            try {
              await pool.request().query(batch);
            } catch (batchError) {
              console.error(`❌ Error en batch de ${scriptFile}:`, batchError.message);
              // Continuar con el siguiente batch
            }
          }
        }
        
        console.log(`✅ ${scriptFile} ejecutado exitosamente`);
      } else {
        console.log(`⚠️ Script ${scriptFile} no encontrado, saltando...`);
      }
    }
    
    // Cerrar conexión
    await pool.close();
    
    console.log('🎉 ¡Base de datos configurada exitosamente!');
    console.log('');
    console.log('Próximos pasos:');
    console.log('1. Verificar que el archivo .env tenga las credenciales correctas');
    console.log('2. Reiniciar el servidor: npm run dev');
    console.log('3. La funcionalidad de agrupaciones ya está disponible');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error.message);
    console.log('');
    console.log('Posibles soluciones:');
    console.log('1. Verificar que SQL Server esté ejecutándose');
    console.log('2. Confirmar credenciales en el archivo .env');
    console.log('3. Verificar permisos del usuario de base de datos');
    console.log('4. Ejecutar manualmente los scripts en SQL Server Management Studio');
    
    process.exit(1);
  }
}

// Verificar configuración antes de ejecutar
function checkConfiguration() {
  const requiredVars = ['DB_SERVER'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.log('');
    console.log('Por favor configura estas variables en tu archivo .env');
    console.log('Puedes usar .env.example como referencia');
    process.exit(1);
  }
  
  // Verificar si se está usando Windows Auth o SQL Auth
  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('🔐 Usando SQL Server Authentication');
  } else {
    console.log('🔐 Usando Windows Authentication');
  }
}

// Ejecutar setup
if (require.main === module) {
  checkConfiguration();
  setupDatabase();
}

module.exports = { setupDatabase };