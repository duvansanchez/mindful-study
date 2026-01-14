-- Script para agregar FolderId a DatabaseGroupMappings
-- Permite asignar bases de datos a carpetas dentro de una agrupación

USE MindfulStudy;
GO

-- Agregar columna FolderId a DatabaseGroupMappings si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[app].[DatabaseGroupMappings]') AND name = 'FolderId')
BEGIN
    ALTER TABLE [app].[DatabaseGroupMappings]
    ADD [FolderId] UNIQUEIDENTIFIER NULL;
    
    PRINT 'Columna FolderId agregada a DatabaseGroupMappings';
    
    -- Agregar foreign key
    ALTER TABLE [app].[DatabaseGroupMappings]
    ADD CONSTRAINT FK_DatabaseGroupMappings_GroupFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [app].[GroupFolders]([Id]) ON DELETE SET NULL;
    
    PRINT 'Foreign key FK_DatabaseGroupMappings_GroupFolders creada';
END
ELSE
BEGIN
    PRINT 'La columna FolderId ya existe en DatabaseGroupMappings';
END
GO

-- Crear índice para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DatabaseGroupMappings_FolderId')
BEGIN
    CREATE INDEX IX_DatabaseGroupMappings_FolderId ON [app].[DatabaseGroupMappings]([FolderId]);
    PRINT 'Índice IX_DatabaseGroupMappings_FolderId creado';
END
GO

PRINT 'Script completado exitosamente';
