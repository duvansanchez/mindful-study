const sql = require('mssql');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  database: process.env.DB_DATABASE || 'MindfulStudy',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '123',
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
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

let poolPromise;

// Inicializar pool de conexiones
const initializeDatabase = async () => {
  try {
    console.log('🔧 DEBUG: Intentando conectar a SQL Server...');
    console.log('🔧 DEBUG: Server:', dbConfig.server);
    console.log('🔧 DEBUG: Database:', dbConfig.database);
    console.log('🔧 DEBUG: User:', dbConfig.user);
    console.log('🔧 DEBUG: Encrypt:', dbConfig.options.encrypt);
    console.log('🔧 DEBUG: TrustServerCertificate:', dbConfig.options.trustServerCertificate);
    
    if (!poolPromise) {
      poolPromise = new sql.ConnectionPool(dbConfig).connect();
    }
    await poolPromise;
    console.log('✅ Conexión a SQL Server establecida');
    return true;
  } catch (error) {
    console.error('❌ Error conectando a SQL Server:', error.message);
    console.error('🔧 DEBUG: Error completo:', error);
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
          FolderId,
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
          folderId: group.FolderId,
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
        if (updates.name || updates.color || updates.folderId !== undefined) {
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
          if (updates.folderId !== undefined) {
            request.input('folderId', sql.UniqueIdentifier, updates.folderId);
            setClause.push('FolderId = @folderId');
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
          SELECT NotionDatabaseId, NotionDatabaseName, FolderId, AddedAt
          FROM app.DatabaseGroupMappings
          WHERE GroupId = @groupId
          ORDER BY AddedAt
        `);
      
      return result.recordset.map(db => ({
        id: db.NotionDatabaseId,
        name: db.NotionDatabaseName,
        folderId: db.FolderId,
        addedAt: db.AddedAt
      }));
    } catch (error) {
      console.error('Error obteniendo bases de datos de agrupación:', error);
      throw error;
    }
  }

  // Mover base de datos a carpeta dentro de una agrupación
  static async moveDatabaseToFolder(groupId, databaseId, folderId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('databaseId', sql.NVarChar(255), databaseId)
        .input('folderId', sql.UniqueIdentifier, folderId)
        .query(`
          UPDATE app.DatabaseGroupMappings
          SET FolderId = @folderId
          WHERE GroupId = @groupId AND NotionDatabaseId = @databaseId
        `);
      
      return true;
    } catch (error) {
      console.error('Error moviendo base de datos a carpeta:', error);
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

  static async getNotesCountByDatabase(databaseId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('DatabaseId', sql.NVarChar, databaseId);

      const result = await request.query(`
        SELECT FlashcardId, COUNT(*) as NotesCount
        FROM app.ReviewNotes
        WHERE NotionDatabaseId = @DatabaseId
        GROUP BY FlashcardId
      `);

      // Convertir a objeto para fácil lookup
      const notesCounts = {};
      result.recordset.forEach(row => {
        notesCounts[row.FlashcardId] = row.NotesCount;
      });

      return notesCounts;
    } catch (error) {
      console.error('Error getting notes count by database:', error);
      throw error;
    }
  }

  // ==================== PUNTOS DE REFERENCIA ====================

  // Crear punto de referencia
  static async createReferencePoint(flashcardId, databaseId, selectedText, referenceName, options = {}) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('FlashcardId', sql.NVarChar, flashcardId);
      request.input('DatabaseId', sql.NVarChar, databaseId);
      request.input('SelectedText', sql.NVarChar, selectedText);
      request.input('ReferenceName', sql.NVarChar, referenceName);
      request.input('TextPosition', sql.Int, options.textPosition || null);
      request.input('BlockId', sql.NVarChar, options.blockId || null);
      request.input('ContextBefore', sql.NVarChar, options.contextBefore || null);
      request.input('ContextAfter', sql.NVarChar, options.contextAfter || null);
      request.input('Category', sql.NVarChar, options.category || 'general');
      request.input('Color', sql.NVarChar, options.color || '#3B82F6');
      request.input('Notes', sql.NVarChar, options.notes || null);

      const result = await request.query(`
        INSERT INTO ReferencePoints 
        (flashcard_id, database_id, selected_text, reference_name, text_position, block_id, context_before, context_after, category, color, notes)
        OUTPUT INSERTED.*
        VALUES (@FlashcardId, @DatabaseId, @SelectedText, @ReferenceName, @TextPosition, @BlockId, @ContextBefore, @ContextAfter, @Category, @Color, @Notes)
      `);

      return result.recordset[0];
    } catch (error) {
      console.error('Error creating reference point:', error);
      throw error;
    }
  }

  // Obtener puntos de referencia de una flashcard
  static async getReferencePoints(flashcardId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('FlashcardId', sql.NVarChar, flashcardId);

      const result = await request.query(`
        SELECT * FROM ReferencePoints
        WHERE flashcard_id = @FlashcardId
        ORDER BY created_at ASC
      `);

      return result.recordset.map(row => ({
        id: row.id,
        flashcardId: row.flashcard_id,
        databaseId: row.database_id,
        selectedText: row.selected_text,
        referenceName: row.reference_name,
        textPosition: row.text_position,
        blockId: row.block_id,
        contextBefore: row.context_before,
        contextAfter: row.context_after,
        category: row.category,
        color: row.color,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting reference points:', error);
      throw error;
    }
  }

  // Actualizar punto de referencia
  static async updateReferencePoint(referenceId, updates) {
    try {
      console.log('🔧 DEBUG updateReferencePoint - referenceId:', referenceId);
      console.log('🔧 DEBUG updateReferencePoint - updates:', JSON.stringify(updates, null, 2));
      
      const pool = await getPool();
      const request = pool.request();
      
      request.input('ReferenceId', sql.Int, referenceId);
      
      const updateFields = [];
      const allowedFields = ['referenceName', 'category', 'color', 'notes'];
      
      if (updates.referenceName !== undefined) {
        console.log('🔧 DEBUG - Actualizando referenceName:', updates.referenceName);
        request.input('ReferenceName', sql.NVarChar, updates.referenceName);
        updateFields.push('reference_name = @ReferenceName');
      }
      if (updates.category !== undefined) {
        console.log('🔧 DEBUG - Actualizando category:', updates.category);
        request.input('Category', sql.NVarChar, updates.category);
        updateFields.push('category = @Category');
      }
      if (updates.color !== undefined) {
        console.log('🔧 DEBUG - Actualizando color:', updates.color);
        request.input('Color', sql.NVarChar, updates.color);
        updateFields.push('color = @Color');
      }
      if (updates.notes !== undefined) {
        console.log('🔧 DEBUG - Actualizando notes:', updates.notes);
        request.input('Notes', sql.NVarChar, updates.notes);
        updateFields.push('notes = @Notes');
      }

      console.log('🔧 DEBUG - updateFields:', updateFields);

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push('updated_at = GETDATE()');

      const result = await request.query(`
        UPDATE ReferencePoints 
        SET ${updateFields.join(', ')}
        WHERE id = @ReferenceId
      `);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('Error updating reference point:', error);
      throw error;
    }
  }

  // Eliminar punto de referencia
  static async deleteReferencePoint(referenceId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('ReferenceId', sql.Int, referenceId);

      const result = await request.query(`
        DELETE FROM ReferencePoints 
        WHERE id = @ReferenceId
      `);

      return result.rowsAffected[0] > 0;
    } catch (error) {
      console.error('Error deleting reference point:', error);
      throw error;
    }
  }

  // Obtener conteo de puntos de referencia por base de datos
  static async getReferencePointsCountByDatabase(databaseId) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      request.input('DatabaseId', sql.NVarChar, databaseId);

      const result = await request.query(`
        SELECT flashcard_id, COUNT(*) as ReferencePointsCount
        FROM ReferencePoints
        WHERE database_id = @DatabaseId
        GROUP BY flashcard_id
      `);

      // Convertir a objeto para fácil lookup
      const referencePointsCounts = {};
      result.recordset.forEach(row => {
        referencePointsCounts[row.flashcard_id] = row.ReferencePointsCount;
      });

      return referencePointsCounts;
    } catch (error) {
      console.error('Error getting reference points count by database:', error);
      throw error;
    }
  }

  // ==================== PLANIFICACIÓN ====================

  // Obtener sesiones de planificación de un grupo
  static async getPlanningSessionsByGroup(groupId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT 
            Id,
            GroupId,
            SessionName,
            DatabaseId,
            DatabaseIds,
            SessionNote,
            StudyMode,
            SelectedFlashcards,
            OrderIndex,
            FolderId,
            CreatedAt,
            UpdatedAt
          FROM PlanningSession 
          WHERE GroupId = @groupId 
          ORDER BY OrderIndex ASC, CreatedAt ASC
        `);

      console.log('🔧 getPlanningSessionsByGroup - sesiones encontradas:', result.recordset.length);

      return result.recordset.map(row => {
        console.log('🔧 Procesando sesión:', row.SessionName);
        console.log('  - DatabaseId (single):', row.DatabaseId);
        console.log('  - DatabaseIds (raw):', row.DatabaseIds);
        
        // CORRECCIÓN CRÍTICA: Parsear DatabaseIds correctamente
        let databaseIds = [row.DatabaseId]; // Fallback por defecto
        
        if (row.DatabaseIds) {
          try {
            const parsed = JSON.parse(row.DatabaseIds);
            if (Array.isArray(parsed) && parsed.length > 0) {
              databaseIds = parsed;
              console.log('  - DatabaseIds (parsed successfully):', databaseIds);
            } else {
              console.warn('  - DatabaseIds parsed but empty/invalid, using fallback');
            }
          } catch (e) {
            console.error('  - Error parsing DatabaseIds for session', row.Id, ':', e.message);
            console.error('  - Raw DatabaseIds value:', row.DatabaseIds);
          }
        } else {
          console.log('  - DatabaseIds is null/empty, using fallback:', databaseIds);
        }

        // Parsear SelectedFlashcards
        let selectedFlashcards = [];
        if (row.SelectedFlashcards) {
          try {
            selectedFlashcards = JSON.parse(row.SelectedFlashcards);
            console.log('  - SelectedFlashcards count:', selectedFlashcards.length);
          } catch (e) {
            console.error('  - Error parsing SelectedFlashcards:', e.message);
          }
        }

        const sessionData = {
          id: row.Id,
          groupId: row.GroupId,
          sessionName: row.SessionName,
          databaseId: row.DatabaseId,
          databaseIds: databaseIds, // Usar el array parseado correctamente
          sessionNote: row.SessionNote,
          studyMode: row.StudyMode,
          selectedFlashcards: selectedFlashcards,
          orderIndex: row.OrderIndex,
          folderId: row.FolderId,
          createdAt: row.CreatedAt,
          updatedAt: row.UpdatedAt
        };

        console.log('  - Final databaseIds:', sessionData.databaseIds);
        console.log('  - Final selectedFlashcards count:', sessionData.selectedFlashcards.length);

        return sessionData;
      });
    } catch (error) {
      console.error('Error obteniendo sesiones de planificación:', error);
      throw error;
    }
  }

  // Crear nueva sesión de planificación
  static async createPlanningSession(groupId, sessionName, databaseId, sessionNote, studyMode, selectedFlashcards, orderIndex, databaseIds = null) {
    console.log('🔧 createPlanningSession - INICIANDO');
    console.log('🔧 Parámetros recibidos:', { groupId, sessionName, databaseId, sessionNote, studyMode, selectedFlashcards: selectedFlashcards?.length, orderIndex, databaseIds });
    
    try {
      const pool = await getPool();
      const sessionId = require('crypto').randomUUID();
      
      // Si no se proporciona orderIndex, obtener el siguiente disponible
      if (orderIndex === undefined || orderIndex === null) {
        const maxOrderResult = await pool.request()
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            SELECT ISNULL(MAX(OrderIndex), 0) + 1 as NextOrder
            FROM PlanningSession 
            WHERE GroupId = @groupId
          `);
        orderIndex = maxOrderResult.recordset[0].NextOrder;
      }

      // Convertir array de flashcards a JSON
      const selectedFlashcardsJson = selectedFlashcards && selectedFlashcards.length > 0 
        ? JSON.stringify(selectedFlashcards) 
        : null;

      // CORRECCIÓN CRÍTICA: Asegurar que databaseIds siempre tenga un valor válido
      let finalDatabaseIds;
      if (databaseIds && Array.isArray(databaseIds) && databaseIds.length > 0) {
        finalDatabaseIds = databaseIds;
      } else {
        finalDatabaseIds = [databaseId];
      }
      
      const databaseIdsJson = JSON.stringify(finalDatabaseIds);

      console.log('🔧 Valores finales a guardar:');
      console.log('  - finalDatabaseIds:', finalDatabaseIds);
      console.log('  - databaseIdsJson:', databaseIdsJson);
      console.log('  - selectedFlashcardsJson:', selectedFlashcardsJson);

      const insertResult = await pool.request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('sessionName', sql.NVarChar(255), sessionName)
        .input('databaseId', sql.NVarChar(255), databaseId)
        .input('sessionNote', sql.NVarChar(sql.MAX), sessionNote)
        .input('studyMode', sql.NVarChar(50), studyMode)
        .input('selectedFlashcards', sql.NVarChar(sql.MAX), selectedFlashcardsJson)
        .input('databaseIds', sql.NVarChar(sql.MAX), databaseIdsJson)
        .input('orderIndex', sql.Int, orderIndex)
        .query(`
          INSERT INTO PlanningSession (
            Id, GroupId, SessionName, DatabaseId, SessionNote, StudyMode, SelectedFlashcards, DatabaseIds, OrderIndex, CreatedAt, UpdatedAt
          ) VALUES (
            @sessionId, @groupId, @sessionName, @databaseId, @sessionNote, @studyMode, @selectedFlashcards, @databaseIds, @orderIndex, GETDATE(), GETDATE()
          )
        `);

      console.log('🔧 INSERT completado, filas afectadas:', insertResult.rowsAffected[0]);

      // CORRECCIÓN CRÍTICA: Verificar que se guardó correctamente y mostrar más detalles
      const verifyResult = await pool.request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query('SELECT * FROM PlanningSession WHERE Id = @sessionId');
      
      const saved = verifyResult.recordset[0];
      console.log('🔧 Verificación COMPLETA - Registro guardado:');
      console.log('  - Id:', saved.Id);
      console.log('  - SessionName:', saved.SessionName);
      console.log('  - DatabaseId:', saved.DatabaseId);
      console.log('  - DatabaseIds (raw):', saved.DatabaseIds);
      console.log('  - SelectedFlashcards (raw):', saved.SelectedFlashcards);
      
      // Intentar parsear para verificar que es JSON válido
      try {
        const parsedDbIds = JSON.parse(saved.DatabaseIds || '[]');
        console.log('  - DatabaseIds (parsed):', parsedDbIds);
      } catch (e) {
        console.error('  - ERROR parsing DatabaseIds:', e.message);
      }

      return {
        id: sessionId,
        groupId,
        sessionName,
        databaseId,
        databaseIds: finalDatabaseIds,
        sessionNote,
        studyMode,
        selectedFlashcards: selectedFlashcards || [],
        orderIndex,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ Error en createPlanningSession:', error);
      throw error;
    }
  }

  // Reordenar sesiones de planificación
  static async reorderPlanningSessions(groupId, sessionOrders) {
    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        for (const { sessionId, orderIndex } of sessionOrders) {
          await transaction.request()
            .input('sessionId', sql.UniqueIdentifier, sessionId)
            .input('groupId', sql.UniqueIdentifier, groupId)
            .input('orderIndex', sql.Int, orderIndex)
            .query(`
              UPDATE PlanningSession 
              SET OrderIndex = @orderIndex, UpdatedAt = GETDATE()
              WHERE Id = @sessionId AND GroupId = @groupId
            `);
        }
        
        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error reordenando sesiones de planificación:', error);
      throw error;
    }
  }

  // Actualizar sesión de planificación
  static async updatePlanningSession(sessionId, updates) {
    try {
      const pool = await getPool();
      const request = pool.request();
      const setClause = [];

      request.input('sessionId', sql.UniqueIdentifier, sessionId);

      if (updates.sessionName !== undefined) {
        request.input('sessionName', sql.NVarChar(255), updates.sessionName);
        setClause.push('SessionName = @sessionName');
      }

      if (updates.databaseId !== undefined) {
        request.input('databaseId', sql.NVarChar(255), updates.databaseId);
        setClause.push('DatabaseId = @databaseId');
      }

      if (updates.databaseIds !== undefined) {
        const databaseIdsJson = updates.databaseIds && updates.databaseIds.length > 0 
          ? JSON.stringify(updates.databaseIds) 
          : null;
        request.input('databaseIds', sql.NVarChar(sql.MAX), databaseIdsJson);
        setClause.push('DatabaseIds = @databaseIds');
      }

      if (updates.sessionNote !== undefined) {
        request.input('sessionNote', sql.NVarChar(sql.MAX), updates.sessionNote);
        setClause.push('SessionNote = @sessionNote');
      }

      if (updates.studyMode !== undefined) {
        request.input('studyMode', sql.NVarChar(50), updates.studyMode);
        setClause.push('StudyMode = @studyMode');
      }

      if (updates.selectedFlashcards !== undefined) {
        const selectedFlashcardsJson = updates.selectedFlashcards && updates.selectedFlashcards.length > 0 
          ? JSON.stringify(updates.selectedFlashcards) 
          : null;
        request.input('selectedFlashcards', sql.NVarChar(sql.MAX), selectedFlashcardsJson);
        setClause.push('SelectedFlashcards = @selectedFlashcards');
      }

      if (updates.orderIndex !== undefined) {
        request.input('orderIndex', sql.Int, updates.orderIndex);
        setClause.push('OrderIndex = @orderIndex');
      }

      if (updates.folderId !== undefined) {
        request.input('folderId', sql.UniqueIdentifier, updates.folderId);
        setClause.push('FolderId = @folderId');
      }

      if (setClause.length === 0) {
        return true; // No hay nada que actualizar
      }

      setClause.push('UpdatedAt = GETDATE()');

      await request.query(`
        UPDATE PlanningSession 
        SET ${setClause.join(', ')}
        WHERE Id = @sessionId
      `);

      return true;
    } catch (error) {
      console.error('Error actualizando sesión de planificación:', error);
      throw error;
    }
  }

  // Eliminar sesión de planificación
  static async deletePlanningSession(sessionId) {
    try {
      const pool = await getPool();
      await pool.request()
        .input('sessionId', sql.UniqueIdentifier, sessionId)
        .query(`DELETE FROM PlanningSession WHERE Id = @sessionId`);
      
      return true;
    } catch (error) {
      console.error('Error eliminando sesión de planificación:', error);
      throw error;
    }
  }

  // ==================== CARPETAS DE SESIONES ====================

  // Obtener carpetas de un grupo
  static async getSessionFoldersByGroup(groupId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT 
            Id,
            GroupId,
            FolderName,
            Color,
            Icon,
            OrderIndex,
            IsExpanded,
            CreatedAt,
            UpdatedAt
          FROM SessionFolders 
          WHERE GroupId = @groupId 
          ORDER BY OrderIndex ASC, CreatedAt ASC
        `);

      return result.recordset.map(row => ({
        id: row.Id,
        groupId: row.GroupId,
        folderName: row.FolderName,
        color: row.Color,
        icon: row.Icon,
        orderIndex: row.OrderIndex,
        isExpanded: row.IsExpanded,
        createdAt: row.CreatedAt,
        updatedAt: row.UpdatedAt
      }));
    } catch (error) {
      console.error('Error obteniendo carpetas de sesiones:', error);
      throw error;
    }
  }

  // Crear carpeta de sesiones
  static async createSessionFolder(groupId, folderName, color = '#3B82F6', icon = '📁', orderIndex = null) {
    try {
      const pool = await getPool();
      const folderId = require('crypto').randomUUID();
      
      // Si no se proporciona orderIndex, obtener el siguiente disponible
      if (orderIndex === undefined || orderIndex === null) {
        const maxOrderResult = await pool.request()
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            SELECT ISNULL(MAX(OrderIndex), 0) + 1 as NextOrder
            FROM SessionFolders 
            WHERE GroupId = @groupId
          `);
        orderIndex = maxOrderResult.recordset[0].NextOrder;
      }

      await pool.request()
        .input('folderId', sql.UniqueIdentifier, folderId)
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('folderName', sql.NVarChar(255), folderName)
        .input('color', sql.NVarChar(50), color)
        .input('icon', sql.NVarChar(10), icon)
        .input('orderIndex', sql.Int, orderIndex)
        .query(`
          INSERT INTO SessionFolders (
            Id, GroupId, FolderName, Color, Icon, OrderIndex, CreatedAt, UpdatedAt
          ) VALUES (
            @folderId, @groupId, @folderName, @color, @icon, @orderIndex, GETDATE(), GETDATE()
          )
        `);

      return {
        id: folderId,
        groupId,
        folderName,
        color,
        icon,
        orderIndex,
        isExpanded: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creando carpeta de sesiones:', error);
      throw error;
    }
  }

  // Actualizar carpeta de sesiones
  static async updateSessionFolder(folderId, updates) {
    try {
      const pool = await getPool();
      const request = pool.request();
      const setClause = [];

      request.input('folderId', sql.UniqueIdentifier, folderId);

      if (updates.folderName !== undefined) {
        request.input('folderName', sql.NVarChar(255), updates.folderName);
        setClause.push('FolderName = @folderName');
      }

      if (updates.color !== undefined) {
        request.input('color', sql.NVarChar(50), updates.color);
        setClause.push('Color = @color');
      }

      if (updates.icon !== undefined) {
        request.input('icon', sql.NVarChar(10), updates.icon);
        setClause.push('Icon = @icon');
      }

      if (updates.orderIndex !== undefined) {
        request.input('orderIndex', sql.Int, updates.orderIndex);
        setClause.push('OrderIndex = @orderIndex');
      }

      if (updates.isExpanded !== undefined) {
        request.input('isExpanded', sql.Bit, updates.isExpanded);
        setClause.push('IsExpanded = @isExpanded');
      }

      if (setClause.length === 0) {
        return true;
      }

      setClause.push('UpdatedAt = GETDATE()');

      await request.query(`
        UPDATE SessionFolders 
        SET ${setClause.join(', ')}
        WHERE Id = @folderId
      `);

      return true;
    } catch (error) {
      console.error('Error actualizando carpeta de sesiones:', error);
      throw error;
    }
  }

  // Eliminar carpeta de sesiones
  static async deleteSessionFolder(folderId) {
    try {
      const pool = await getPool();
      
      // Las sesiones dentro de la carpeta se moverán a "sin carpeta" (FolderId = NULL)
      // gracias a ON DELETE SET NULL en la foreign key
      await pool.request()
        .input('folderId', sql.UniqueIdentifier, folderId)
        .query(`DELETE FROM SessionFolders WHERE Id = @folderId`);
      
      return true;
    } catch (error) {
      console.error('Error eliminando carpeta de sesiones:', error);
      throw error;
    }
  }

  // Reordenar carpetas de sesiones
  static async reorderSessionFolders(groupId, folderOrders) {
    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        for (const { folderId, orderIndex } of folderOrders) {
          await transaction.request()
            .input('folderId', sql.UniqueIdentifier, folderId)
            .input('groupId', sql.UniqueIdentifier, groupId)
            .input('orderIndex', sql.Int, orderIndex)
            .query(`
              UPDATE SessionFolders 
              SET OrderIndex = @orderIndex, UpdatedAt = GETDATE()
              WHERE Id = @folderId AND GroupId = @groupId
            `);
        }
        
        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error reordenando carpetas de sesiones:', error);
      throw error;
    }
  }

  // ==================== CARPETAS DE AGRUPACIONES ====================

  // Obtener carpetas de una agrupación específica
  static async getGroupFoldersByGroup(groupId) {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .input('groupId', sql.UniqueIdentifier, groupId)
        .query(`
          SELECT 
            Id,
            GroupId,
            FolderName,
            Color,
            Icon,
            OrderIndex,
            IsExpanded,
            CreatedAt,
            UpdatedAt
          FROM app.GroupFolders 
          WHERE GroupId = @groupId
          ORDER BY OrderIndex ASC, CreatedAt ASC
        `);

      return result.recordset.map(row => ({
        id: row.Id,
        groupId: row.GroupId,
        folderName: row.FolderName,
        color: row.Color,
        icon: row.Icon,
        orderIndex: row.OrderIndex,
        isExpanded: row.IsExpanded,
        createdAt: row.CreatedAt,
        updatedAt: row.UpdatedAt
      }));
    } catch (error) {
      console.error('Error obteniendo carpetas de agrupación:', error);
      throw error;
    }
  }

  // Obtener todas las carpetas de agrupaciones (mantener para compatibilidad)
  static async getGroupFolders() {
    try {
      const pool = await getPool();
      const result = await pool.request()
        .query(`
          SELECT 
            Id,
            GroupId,
            FolderName,
            Color,
            Icon,
            OrderIndex,
            IsExpanded,
            CreatedAt,
            UpdatedAt
          FROM app.GroupFolders 
          ORDER BY GroupId, OrderIndex ASC, CreatedAt ASC
        `);

      return result.recordset.map(row => ({
        id: row.Id,
        groupId: row.GroupId,
        folderName: row.FolderName,
        color: row.Color,
        icon: row.Icon,
        orderIndex: row.OrderIndex,
        isExpanded: row.IsExpanded,
        createdAt: row.CreatedAt,
        updatedAt: row.UpdatedAt
      }));
    } catch (error) {
      console.error('Error obteniendo carpetas de agrupaciones:', error);
      throw error;
    }
  }

  // Crear carpeta de agrupaciones
  static async createGroupFolder(groupId, folderName, color = '#3B82F6', icon = '📁', orderIndex = null) {
    try {
      const pool = await getPool();
      const folderId = require('crypto').randomUUID();
      
      // Si no se proporciona orderIndex, obtener el siguiente disponible
      if (orderIndex === undefined || orderIndex === null) {
        const maxOrderResult = await pool.request()
          .input('groupId', sql.UniqueIdentifier, groupId)
          .query(`
            SELECT ISNULL(MAX(OrderIndex), 0) + 1 as NextOrder
            FROM app.GroupFolders
            WHERE GroupId = @groupId
          `);
        orderIndex = maxOrderResult.recordset[0].NextOrder;
      }

      await pool.request()
        .input('folderId', sql.UniqueIdentifier, folderId)
        .input('groupId', sql.UniqueIdentifier, groupId)
        .input('folderName', sql.NVarChar(255), folderName)
        .input('color', sql.NVarChar(50), color)
        .input('icon', sql.NVarChar(10), icon)
        .input('orderIndex', sql.Int, orderIndex)
        .query(`
          INSERT INTO app.GroupFolders (
            Id, GroupId, FolderName, Color, Icon, OrderIndex, CreatedAt, UpdatedAt
          ) VALUES (
            @folderId, @groupId, @folderName, @color, @icon, @orderIndex, GETDATE(), GETDATE()
          )
        `);

      return {
        id: folderId,
        groupId,
        folderName,
        color,
        icon,
        orderIndex,
        isExpanded: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error creando carpeta de agrupación:', error);
      throw error;
    }
  }

  // Actualizar carpeta de agrupaciones
  static async updateGroupFolder(folderId, updates) {
    try {
      const pool = await getPool();
      const request = pool.request();
      const setClause = [];

      request.input('folderId', sql.UniqueIdentifier, folderId);

      if (updates.folderName !== undefined) {
        request.input('folderName', sql.NVarChar(255), updates.folderName);
        setClause.push('FolderName = @folderName');
      }

      if (updates.color !== undefined) {
        request.input('color', sql.NVarChar(50), updates.color);
        setClause.push('Color = @color');
      }

      if (updates.icon !== undefined) {
        request.input('icon', sql.NVarChar(10), updates.icon);
        setClause.push('Icon = @icon');
      }

      if (updates.orderIndex !== undefined) {
        request.input('orderIndex', sql.Int, updates.orderIndex);
        setClause.push('OrderIndex = @orderIndex');
      }

      if (updates.isExpanded !== undefined) {
        request.input('isExpanded', sql.Bit, updates.isExpanded);
        setClause.push('IsExpanded = @isExpanded');
      }

      if (setClause.length === 0) {
        return true;
      }

      setClause.push('UpdatedAt = GETDATE()');

      await request.query(`
        UPDATE app.GroupFolders 
        SET ${setClause.join(', ')}
        WHERE Id = @folderId
      `);

      return true;
    } catch (error) {
      console.error('Error actualizando carpeta de agrupaciones:', error);
      throw error;
    }
  }

  // Eliminar carpeta de agrupaciones
  static async deleteGroupFolder(folderId) {
    try {
      const pool = await getPool();
      
      // Las agrupaciones dentro de la carpeta se moverán a "sin carpeta" (FolderId = NULL)
      // gracias a ON DELETE SET NULL en la foreign key
      await pool.request()
        .input('folderId', sql.UniqueIdentifier, folderId)
        .query(`DELETE FROM app.GroupFolders WHERE Id = @folderId`);
      
      return true;
    } catch (error) {
      console.error('Error eliminando carpeta de agrupaciones:', error);
      throw error;
    }
  }

  // Reordenar carpetas de agrupaciones
  static async reorderGroupFolders(groupId, folderOrders) {
    try {
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);
      
      await transaction.begin();
      
      try {
        for (const { folderId, orderIndex } of folderOrders) {
          await transaction.request()
            .input('folderId', sql.UniqueIdentifier, folderId)
            .input('groupId', sql.UniqueIdentifier, groupId)
            .input('orderIndex', sql.Int, orderIndex)
            .query(`
              UPDATE app.GroupFolders 
              SET OrderIndex = @orderIndex, UpdatedAt = GETDATE()
              WHERE Id = @folderId AND GroupId = @groupId
            `);
        }
        
        await transaction.commit();
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error reordenando carpetas de agrupaciones:', error);
      throw error;
    }
  }
}

module.exports = {
  initializeDatabase,
  DatabaseService,
  sql
};