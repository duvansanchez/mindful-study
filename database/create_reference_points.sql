-- Crear tabla para puntos de referencia
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ReferencePoints' AND xtype='U')
BEGIN
    CREATE TABLE ReferencePoints (
        id INT IDENTITY(1,1) PRIMARY KEY,
        flashcard_id NVARCHAR(255) NOT NULL,
        database_id NVARCHAR(255) NOT NULL,
        selected_text NVARCHAR(MAX) NOT NULL,
        reference_name NVARCHAR(255) NOT NULL,
        text_position INT NULL, -- posición aproximada del texto
        block_id NVARCHAR(255) NULL, -- ID del bloque de Notion donde está
        context_before NVARCHAR(500) NULL, -- texto antes para mejor ubicación
        context_after NVARCHAR(500) NULL, -- texto después para mejor ubicación
        category NVARCHAR(100) DEFAULT 'general', -- categoría del punto de referencia
        color NVARCHAR(20) DEFAULT '#3B82F6', -- color para el highlight
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Índices para mejor rendimiento
    CREATE INDEX IX_ReferencePoints_FlashcardId ON ReferencePoints(flashcard_id);
    CREATE INDEX IX_ReferencePoints_DatabaseId ON ReferencePoints(database_id);
    
    PRINT '✅ Tabla ReferencePoints creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️ Tabla ReferencePoints ya existe';
END