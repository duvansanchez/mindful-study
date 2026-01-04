-- Crear tabla para sesiones de planificación
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PlanningSession' AND xtype='U')
BEGIN
    CREATE TABLE PlanningSession (
        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        GroupId UNIQUEIDENTIFIER NOT NULL,
        SessionName NVARCHAR(255) NOT NULL,
        DatabaseId NVARCHAR(255) NOT NULL,
        SessionNote NVARCHAR(MAX),
        StudyMode NVARCHAR(50) NOT NULL CHECK (StudyMode IN ('review', 'matching', 'overview')),
        SelectedFlashcards NVARCHAR(MAX), -- JSON array de IDs de flashcards seleccionadas
        OrderIndex INT NOT NULL DEFAULT 1,
        CreatedAt DATETIME2 DEFAULT GETDATE(),
        UpdatedAt DATETIME2 DEFAULT GETDATE(),
        
        -- Índices para mejorar rendimiento
        INDEX IX_PlanningSession_GroupId (GroupId),
        INDEX IX_PlanningSession_OrderIndex (GroupId, OrderIndex)
    );
    
    PRINT 'Tabla PlanningSession creada exitosamente';
END
ELSE
BEGIN
    -- Agregar columna SelectedFlashcards si no existe
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningSession') AND name = 'SelectedFlashcards')
    BEGIN
        ALTER TABLE PlanningSession ADD SelectedFlashcards NVARCHAR(MAX);
        PRINT 'Columna SelectedFlashcards agregada a PlanningSession';
    END
    ELSE
    BEGIN
        PRINT 'Tabla PlanningSession ya existe con todas las columnas';
    END
END