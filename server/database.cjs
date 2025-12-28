const sql = require('mssql');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'MindfulStudy',
  user: process.env.DB_USER || 'mindful_user',
  password: process.env.DB_PASSWORD || 'MindfulStudy2024!',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise;

// Inicializar pool de conexiones
const initializeDatabase = async () => {
  try {
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig).connect();
    }
    await poolPromise;
    console.log('✅ Conexión a SQL Server establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error.message);
    return false;
  }
};

// Obtener pool de conexiones
const getPool = async () => {
  if (!poolPromise) {
    await initializeDatabase();
  }
  return poolPromise;
};

// Servicios de base de datos
class DatabaseService {
  // ==================== AGRUPACIONES ====================
  
  // Obtener todas las agrupaciones
  static async getDatabaseGroups() {
    try {
      const pool = await getPool();
      
      // Obtener las agrupaciones
      const groupsResult = await pool.request().query(`
        SELECT 
          Id,
          Name,
          Color,
          CreatedAt,
          UpdatedAt,
          (SELECT COUNT(*) FROM app.DatabaseGroupMappings WHERE GroupId = dg.Id) as DatabaseCount
        FROM app.DatabaseGroups dg
        WHERE IsActive = 1
        ORDER BY Name
      `);
      
      // Para cada agrupación, obtener sus bases de datos
      const groups = [];
      for (const group of groupsResult.recordset) {
        const mappingsResult = await pool.request()
          .input('groupId', sql.UniqueIdentifier, group.Id)
          .query(`
            SELECT NotionDatabaseId, NotionDatabaseName
            FROM app.DatabaseGroupMappings
            WHERE GroupId = @groupId
          `);
        
        const databaseIds = mappingsResult.recordset.map(mapping => mapping.NotionDatabaseId);
        
        groups.push({
          id: group.Id,
          name: group.Name,
          color: group.Color,
          databaseIds: databaseIds,
          createdAt: group.CreatedAt,
          updatedAt: group.UpdatedAt,
          databaseCount: group.DatabaseCount
        });
      }
      
      return groups;
    } catch (error) {
      console.error('Error obteniendo agrupaciones:', error);
      return [];
    }
  }

  // Obtener una agrupación específica
  static async getDatabaseGroup(groupId) {
    try {
      const pool = await getPool();
      
      // Obtener la agrupación
      const groupResult = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT 
            Id,
            Name,
            Color,
            CreatedAt,
            UpdatedAt
          FROM app.DatabaseGroups
          WHERE Id = @groupId AND IsActive = 1
        `);
      
      if (groupResult.recordset.length === 0) {
        return null;
      }
      
      const group = groupResult.recordset[0];
      
      // Obtener las bases de datos de la agrupación
      const mappingsResult = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT NotionDatabaseId, NotionDatabaseName
          FROM app.DatabaseGroupMappings
          WHERE GroupId = @groupId
        `);
      
      const databaseIds = mappingsResult.recordset.map(mapping => mapping.NotionDatabaseId);
      
      return {
        id: group.Id,
        name: group.Name,
        color: group.Color,
        databaseIds: databaseIds,
        createdAt: group.CreatedAt,
        updatedAt: group.UpdatedAt
      };
    } catch (error) {
      console.error('Error obteniendo agrupación:', error);
      return null;
    }
  }

  // Crear nueva agrupación
  static async createDatabaseGroup(name, color = '#3B82F6', databaseIds = []) {
    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        // Crear la agrupación
        const groupResult = await transaction.request()
          .input('name', sql.NVarChar(255), name)
          .input('color', sql.NVarChar(50), color)
          .query(`
            INSERT INTO app.DatabaseGroups (Name, Color)
            OUTPUT INSERTED.Id
            VALUES (@name, @color)
          `);
        
        const groupId = groupResult.recordset[0].Id;
        
        // Agregar bases de datos a la agrupación
        if (databaseIds && databaseIds.length > 0) {
          for (const dbId of databaseIds) {
            await transaction.request()
              .input('groupId', sql.UniqueIdentifier, groupId)
              .input('notionDbId', sql.NVarChar(255), dbId.id || dbId)
              .input('notionDbName', sql.NVarChar(500), dbId.name || null)
              .query(`
                INSERT INTO app.DatabaseGroupMappings (GroupId, NotionDatabaseId, NotionDatabaseName)
                VALUES (@groupId, @notionDbId, @notionDbName)
              `);
          }
        }
        
        await transaction.commit();
        
        return {
          id: groupId,
          name,
          color,
          databaseIds: databaseIds.map(db => db.id || db),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creando agrupación:', error);
      throw error;
    }
  }

  // Actualizar agrupación
  static async updateDatabaseGroup(groupId, updates) {
    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        // Actualizar información básica
        if (updates.name || updates.color) {
          const request = transaction.request().input('groupId', sql.UniqueIdentifier, groupId);
          
          let setClause = [];
          if (updates.name) {
            request.input('name', sql.NVarChar(255), updates.name);
            setClause.push('Name = @name');
          }
          if (updates.color) {
            request.input('color', sql.NVarChar(50), updates.color);
            setClause.push('Color = @color');
          }
          
          await request.query(`
            UPDATE app.DatabaseGroups 
            SET ${setClause.join(', ')}
            WHERE Id = @groupId
          `);
        }
        
        // Actualizar bases de datos si se proporcionan
        if (updates.databaseIds) {
          // Eliminar mappings existentes
          await transaction.request()
            .input('groupId', sql.UniqueIdentifier, groupId)
            .query('DELETE FROM app.DatabaseGroupMappings WHERE GroupId = @groupId');
          
          // Agregar nuevos mappings
          for (const dbId of updates.databaseIds) {
            await transaction.request()
              .input('groupId', sql.UniqueIdentifier, groupId)
              .input('notionDbId', sql.NVarChar(255), dbId.id || dbId)
              .input('notionDbName', sql.NVarChar(500), dbId.name || null)
              .query(`
                INSERT INTO app.DatabaseGroupMappings (GroupId, NotionDatabaseId, NotionDatabaseName)
                VALUES (@groupId, @notionDbId, @notionDbName)
              `);
          }
        }
        
        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error actualizando agrupación:', error);
      throw error;
    }
  }

  // Eliminar agrupación
  static async deleteDatabaseGroup(groupId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query('UPDATE app.DatabaseGroups SET IsActive = 0 WHERE Id = @groupId');
      
      return true;
    } catch (error) {
      console.error('Error eliminando agrupación:', error);
      throw error;
    }
  }

  // Obtener bases de datos de una agrupación
  static async getDatabasesInGroup(groupId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT NotionDatabaseId, NotionDatabaseName, AddedAt
          FROM app.DatabaseGroupMappings
          WHERE GroupId = @groupId
          ORDER BY AddedAt
        `);
      
      return result.recordset.map(db => ({
        id: db.NotionDatabaseId,
        name: db.NotionDatabaseName,
        addedAt: db.AddedAt
      }));
    } catch (error) {
      console.error('Error obteniendo bases de datos de agrupación:', error);
      throw error;
    }
  }

  // ==================== CONFIGURACIONES ====================
  
  // Obtener configuración
  static async getSetting(key) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('key', sql.NVarChar(100), key)
        .query('SELECT SettingValue, SettingType FROM app.UserSettings WHERE SettingKey = @key');
      
      if (result.recordset.length === 0) return null;
      
      const setting = result.recordset[0];
      let value = setting.SettingValue;
      
      // Convertir según el tipo
      switch (setting.SettingType) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value === 'true';
          break;
        case 'json':
          value = JSON.parse(value);
          break;
      }
      
      return value;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      throw error;
    }
  }

  // Establecer configuración
  static async setSetting(key, value, type = 'string', description = null) {
    try {
      const pool = await getPool();
      
      // Convertir valor a string según el tipo
      let stringValue = value;
      if (type === 'json') {
        stringValue = JSON.stringify(value);
      } else {
        stringValue = String(value);
      }
      
      await pool.request()
        .input('key', sql.NVarChar(100), key)
        .input('value', sql.NVarChar(sql.MAX), stringValue)
        .input('type', sql.NVarChar(50), type)
        .input('description', sql.NVarChar(500), description)
        .query(`
          MERGE app.UserSettings AS target
          USING (SELECT @key as SettingKey) AS source
          ON target.SettingKey = source.SettingKey
          WHEN MATCHED THEN
            UPDATE SET SettingValue = @value, SettingType = @type, UpdatedAt = GETUTCDATE()
          WHEN NOT MATCHED THEN
            INSERT (SettingKey, SettingValue, SettingType, Description)
            VALUES (@key, @value, @type, @description);
        `);
      
      return true;
    } catch (error) {
      console.error('Error estableciendo configuración:', error);
      throw error;
    }
  }

  // ==================== ESTADÍSTICAS ====================
  
  // Registrar evento de estudio
  static async recordStudyEvent(databaseId, flashcardId, eventType, eventValue = null, sessionId = null) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('databaseId', sql.NVarChar(255), databaseId)
        .input('flashcardId', sql.NVarChar(255), flashcardId)
        .input('eventType', sql.NVarChar(50), eventType)
        .input('eventValue', sql.NVarChar(255), eventValue)
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query(`
          INSERT INTO app.StudyStats (NotionDatabaseId, FlashcardId, StatType, StatValue, SessionId)
          VALUES (@databaseId, @flashcardId, @eventType, @eventValue, @sessionId)
        `);
      
      return true;
    } catch (error) {
      console.error('Error registrando evento de estudio:', error);
      throw error;
    }
  }

  // Agregar nota de repaso
  static async addReviewNote(flashcardId, databaseId, noteContent, sessionId = null) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('flashcardId', sql.NVarChar(255), flashcardId)
        .input('databaseId', sql.NVarChar(255), databaseId)
        .input('noteContent', sql.NVarChar(sql.MAX), noteContent)
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query(`
          INSERT INTO app.ReviewNotes (FlashcardId, NotionDatabaseId, NoteContent, SessionId)
          OUTPUT INSERTED.Id, INSERTED.CreatedAt
          VALUES (@flashcardId, @databaseId, @noteContent, @sessionId)
        `);
      
      return {
        id: result.recordset[0].Id,
        content: noteContent,
        createdAt: result.recordset[0].CreatedAt
      };
    } catch (error) {
      console.error('Error agregando nota de repaso:', error);
      throw error;
    }
  }

  // Obtener notas de repaso de una flashcard
  static async getReviewNotes(flashcardId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('flashcardId', sql.NVarChar(255), flashcardId)
        .query(`
          SELECT Id, NoteContent, CreatedAt, SessionId
          FROM app.ReviewNotes
          WHERE FlashcardId = @flashcardId
          ORDER BY CreatedAt DESC
        `);
      
      return result.recordset.map(note => ({
        id: note.Id,
        content: note.NoteContent,
        createdAt: note.CreatedAt,
        sessionId: note.SessionId
      }));
    } catch (error) {
      console.error('Error obteniendo notas de repaso:', error);
      throw error;
    }
  }

  // Eliminar nota de repaso
  static async deleteReviewNote(noteId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('noteId', sql.UniqueIdentifier, noteId)
        .query('DELETE FROM app.ReviewNotes WHERE Id = @noteId');
      
      return true;
    } catch (error) {
      console.error('Error eliminando nota de repaso:', error);
      throw error;
    }
  }

  // Actualizar nota de repaso
  static async updateReviewNote(noteId, newContent) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('noteId', sql.UniqueIdentifier, noteId)
        .input('newContent', sql.NVarChar(sql.MAX), newContent)
        .query(`
          UPDATE app.ReviewNotes 
          SET NoteContent = @newContent
          WHERE Id = @noteId
        `);
      
      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('Error actualizando nota de repaso:', error);
      throw error;
    }
  }

  // ==================== TRACKING DE ESTUDIO ====================
  
  static async recordStudySession(flashcardId, databaseId, groupId, previousState, newState, studyDurationSeconds = 0, reviewNotes = null) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('FlashcardId', sql.NVarChar, flashcardId);
      request.input('DatabaseId', sql.NVarChar, databaseId);
      request.input('GroupId', sql.UniqueIdentifier, groupId || null);
      request.input('PreviousState', sql.NVarChar, previousState);
      request.input('NewState', sql.NVarChar, newState);
      request.input('StudyDurationSeconds', sql.Int, studyDurationSeconds || 0);
      request.input('ReviewNotes', sql.NVarChar, reviewNotes || null);

      await request.execute('app.RecordStudySession');
      return true;
    } catch (error) {
      console.error('Error recording study session:', error);
      throw error;
    }
  }

  static async getStudyStats(groupId = null, period = 'day', offset = 0, databaseId = null) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('GroupId', sql.UniqueIdentifier, groupId || null);
      request.input('DatabaseId', sql.NVarChar, databaseId || null);
      request.input('PeriodType', sql.NVarChar, period);
      request.input('PeriodOffset', sql.Int, offset || 0);

      const result = await request.query(`
        SELECT * FROM app.GetStudyStatsByPeriod(@GroupId, @DatabaseId, @PeriodType, @PeriodOffset)
      `);

      return result.recordset[0] || {
        FlashcardsStudied: 0,
        TotalStudyTimeSeconds: 0,
        StateChangesTocado: 0,
        StateChangesToVerde: 0,
        StateChangesToSolido: 0,
        StudyDays: 0
      };
    } catch (error) {
      console.error('Error getting study stats:', error);
      throw error;
    }
  }

  static async getLastStudyDate(groupId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('GroupId', sql.UniqueIdentifier, groupId);

      const result = await request.query(`
        SELECT TOP 1 StudiedAt
        FROM app.StudySessions
        WHERE GroupId = @GroupId
        ORDER BY StudiedAt DESC
      `);

      return result.recordset[0]?.StudiedAt || null;
    } catch (error) {
      console.error('Error getting last study date:', error);
      throw error;
    }
  }

  static async getFlashcardReviewCount(flashcardId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('FlashcardId', sql.NVarChar, flashcardId);

      const result = await request.query(`
        SELECT COUNT(*) as ReviewCount
        FROM app.StudySessions
        WHERE FlashcardId = @FlashcardId
      `);

      return result.recordset[0]?.ReviewCount || 0;
    } catch (error) {
      console.error('Error getting flashcard review count:', error);
      throw error;
    }
  }
}

module.exports = {
  initializeDatabase,
  DatabaseService,
  sql
};