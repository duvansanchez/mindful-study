-- Script para crear tabla de carpetas de sesiones de planificación
-- Ejecutar en SQL Server Management Studio o con sqlcmd

USE MindfulStudy;
GO

-- Crear tabla de carpetas de sesiones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SessionFolders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SessionFolders] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [FolderName] NVARCHAR(255) NOT NULL,
        [Color] NVARCHAR(50) NULL DEFAULT '#3B82F6',
        [Icon] NVARCHAR(10) NULL DEFAULT '📁',
        [OrderIndex] INT NOT NULL DEFAULT 0,
        [IsExpanded] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT FK_SessionFolders_DatabaseGroups FOREIGN KEY ([GroupId]) 
            REFERENCES [app].[DatabaseGroups]([Id]) ON DELETE CASCADE
    );
    
    PRINT 'Tabla SessionFolders creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla SessionFolders ya existe';
END
GO

-- Agregar columna FolderId a PlanningSession si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PlanningSession]') AND name = 'FolderId')
BEGIN
    ALTER TABLE [dbo].[PlanningSession]
    ADD [FolderId] UNIQUEIDENTIFIER NULL,
    CONSTRAINT FK_PlanningSession_SessionFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [dbo].[SessionFolders]([Id]) ON DELETE SET NULL;
    
    PRINT 'Columna FolderId agregada a PlanningSession';
END
ELSE
BEGIN
    PRINT 'La columna FolderId ya existe en PlanningSession';
END
GO

-- Crear índices para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SessionFolders_GroupId')
BEGIN
    CREATE INDEX IX_SessionFolders_GroupId ON [dbo].[SessionFolders]([GroupId]);
    PRINT 'Índice IX_SessionFolders_GroupId creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanningSession_FolderId')
BEGIN
    CREATE INDEX IX_PlanningSession_FolderId ON [dbo].[PlanningSession]([FolderId]);
    PRINT 'Índice IX_PlanningSession_FolderId creado';
END
GO

PRINT 'Script completado exitosamente';
