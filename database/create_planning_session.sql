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
    PRINT 'Tabla PlanningSession ya existe';
END