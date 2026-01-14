-- Script para crear tabla de carpetas de agrupaciones de estudio
-- Ejecutar en SQL Server Management Studio o con sqlcmd

USE MindfulStudy;
GO

-- Crear tabla de carpetas de agrupaciones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[app].[GroupFolders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [app].[GroupFolders] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [FolderName] NVARCHAR(255) NOT NULL,
        [Color] NVARCHAR(50) NULL DEFAULT '#3B82F6',
        [Icon] NVARCHAR(10) NULL DEFAULT '📁',
        [OrderIndex] INT NOT NULL DEFAULT 0,
        [IsExpanded] BIT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
    );
    
    PRINT 'Tabla GroupFolders creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla GroupFolders ya existe';
END
GO

-- Agregar columna FolderId a DatabaseGroups si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[app].[DatabaseGroups]') AND name = 'FolderId')
BEGIN
    ALTER TABLE [app].[DatabaseGroups]
    ADD [FolderId] UNIQUEIDENTIFIER NULL,
    CONSTRAINT FK_DatabaseGroups_GroupFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [app].[GroupFolders]([Id]) ON DELETE SET NULL;
    
    PRINT 'Columna FolderId agregada a DatabaseGroups';
END
ELSE
BEGIN
    PRINT 'La columna FolderId ya existe en DatabaseGroups';
END
GO

-- Crear índices para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GroupFolders_OrderIndex')
BEGIN
    CREATE INDEX IX_GroupFolders_OrderIndex ON [app].[GroupFolders]([OrderIndex]);
    PRINT 'Índice IX_GroupFolders_OrderIndex creado';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DatabaseGroups_FolderId')
BEGIN
    CREATE INDEX IX_DatabaseGroups_FolderId ON [app].[DatabaseGroups]([FolderId]);
    PRINT 'Índice IX_DatabaseGroups_FolderId creado';
END
GO

PRINT 'Script completado exitosamente';
