-- Script para agregar GroupId a GroupFolders
-- Las carpetas deben pertenecer a una agrupación específica

USE MindfulStudy;
GO

-- Agregar columna GroupId a GroupFolders si no existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[app].[GroupFolders]') AND name = 'GroupId')
BEGIN
    ALTER TABLE [app].[GroupFolders]
    ADD [GroupId] UNIQUEIDENTIFIER NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
    
    PRINT 'Columna GroupId agregada a GroupFolders';
    
    -- Agregar foreign key (sin CASCADE para evitar ciclos)
    ALTER TABLE [app].[GroupFolders]
    ADD CONSTRAINT FK_GroupFolders_DatabaseGroups FOREIGN KEY ([GroupId]) 
        REFERENCES [app].[DatabaseGroups]([Id]) ON DELETE NO ACTION;
    
    PRINT 'Foreign key FK_GroupFolders_DatabaseGroups creada';
END
ELSE
BEGIN
    PRINT 'La columna GroupId ya existe en GroupFolders';
END
GO

-- Crear índice para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GroupFolders_GroupId')
BEGIN
    CREATE INDEX IX_GroupFolders_GroupId ON [app].[GroupFolders]([GroupId]);
    PRINT 'Índice IX_GroupFolders_GroupId creado';
END
GO

PRINT 'Script completado exitosamente';
