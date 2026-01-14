-- Script de actualización de esquema de base de datos
-- Ejecuta todas las migraciones necesarias para actualizar la base de datos

USE MindfulStudy;
GO

PRINT '========================================';
PRINT 'Iniciando actualización de esquema...';
PRINT '========================================';
PRINT '';

-- ==================== MIGRACIÓN 1: DatabaseIds ====================
PRINT '1. Verificando columna DatabaseIds en PlanningSession...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningSession') AND name = 'DatabaseIds')
BEGIN
    PRINT '   -> Agregando columna DatabaseIds...';
    ALTER TABLE PlanningSession ADD DatabaseIds NVARCHAR(MAX);
    
    PRINT '   -> Migrando datos existentes...';
    UPDATE PlanningSession 
    SET DatabaseIds = '["' + DatabaseId + '"]'
    WHERE DatabaseIds IS NULL AND DatabaseId IS NOT NULL;
    
    PRINT '   ✅ Columna DatabaseIds agregada y datos migrados exitosamente';
END
ELSE
BEGIN
    PRINT '   ✅ Columna DatabaseIds ya existe';
END
GO

-- ==================== MIGRACIÓN 2: SessionFolders ====================
PRINT '';
PRINT '2. Verificando tabla SessionFolders...';

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SessionFolders' AND xtype='U')
BEGIN
    PRINT '   -> Creando tabla SessionFolders...';
    CREATE TABLE [dbo].[SessionFolders] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [FolderName] NVARCHAR(255) NOT NULL,
        [Color] NVARCHAR(50) DEFAULT '#3B82F6',
        [OrderIndex] INT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETDATE(),
        
        INDEX IX_SessionFolders_GroupId (GroupId),
        INDEX IX_SessionFolders_OrderIndex (GroupId, OrderIndex)
    );
    PRINT '   ✅ Tabla SessionFolders creada exitosamente';
END
ELSE
BEGIN
    PRINT '   ✅ Tabla SessionFolders ya existe';
END
GO

-- ==================== MIGRACIÓN 3: FolderId en PlanningSession ====================
PRINT '';
PRINT '3. Verificando columna FolderId en PlanningSession...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[PlanningSession]') AND name = 'FolderId')
BEGIN
    PRINT '   -> Agregando columna FolderId...';
    ALTER TABLE [dbo].[PlanningSession]
    ADD [FolderId] UNIQUEIDENTIFIER NULL;
    
    PRINT '   -> Agregando foreign key...';
    ALTER TABLE [dbo].[PlanningSession]
    ADD CONSTRAINT FK_PlanningSession_SessionFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [dbo].[SessionFolders]([Id]) ON DELETE SET NULL;
    
    PRINT '   ✅ Columna FolderId agregada a PlanningSession';
END
ELSE
BEGIN
    PRINT '   ✅ Columna FolderId ya existe en PlanningSession';
END
GO

-- ==================== MIGRACIÓN 4: Índices ====================
PRINT '';
PRINT '4. Verificando índices...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_PlanningSession_FolderId')
BEGIN
    PRINT '   -> Creando índice IX_PlanningSession_FolderId...';
    CREATE INDEX IX_PlanningSession_FolderId ON [dbo].[PlanningSession]([FolderId]);
    PRINT '   ✅ Índice IX_PlanningSession_FolderId creado';
END
ELSE
BEGIN
    PRINT '   ✅ Índice IX_PlanningSession_FolderId ya existe';
END
GO

-- ==================== MIGRACIÓN 5: GroupFolders ====================
PRINT '';
PRINT '5. Verificando tabla GroupFolders...';

IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupFolders' AND xtype='U')
BEGIN
    PRINT '   -> Creando tabla GroupFolders...';
    CREATE TABLE [app].[GroupFolders] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [FolderName] NVARCHAR(255) NOT NULL,
        [Color] NVARCHAR(50) DEFAULT '#3B82F6',
        [OrderIndex] INT NOT NULL DEFAULT 1,
        [CreatedAt] DATETIME2 DEFAULT GETDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETDATE(),
        
        INDEX IX_GroupFolders_GroupId (GroupId),
        INDEX IX_GroupFolders_OrderIndex (GroupId, OrderIndex)
    );
    PRINT '   ✅ Tabla GroupFolders creada exitosamente';
END
ELSE
BEGIN
    PRINT '   ✅ Tabla GroupFolders ya existe';
END
GO

-- ==================== MIGRACIÓN 6: FolderId en DatabaseGroups ====================
PRINT '';
PRINT '6. Verificando columna FolderId en DatabaseGroups...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[app].[DatabaseGroups]') AND name = 'FolderId')
BEGIN
    PRINT '   -> Agregando columna FolderId...';
    ALTER TABLE [app].[DatabaseGroups]
    ADD [FolderId] UNIQUEIDENTIFIER NULL;
    
    PRINT '   -> Agregando foreign key...';
    ALTER TABLE [app].[DatabaseGroups]
    ADD CONSTRAINT FK_DatabaseGroups_GroupFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [app].[GroupFolders]([Id]) ON DELETE SET NULL;
    
    PRINT '   ✅ Columna FolderId agregada a DatabaseGroups';
END
ELSE
BEGIN
    PRINT '   ✅ Columna FolderId ya existe en DatabaseGroups';
END
GO

-- ==================== MIGRACIÓN 7: FolderId en DatabaseGroupMappings ====================
PRINT '';
PRINT '7. Verificando columna FolderId en DatabaseGroupMappings...';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[app].[DatabaseGroupMappings]') AND name = 'FolderId')
BEGIN
    PRINT '   -> Agregando columna FolderId...';
    ALTER TABLE [app].[DatabaseGroupMappings]
    ADD [FolderId] UNIQUEIDENTIFIER NULL;
    
    PRINT '   -> Agregando foreign key...';
    ALTER TABLE [app].[DatabaseGroupMappings]
    ADD CONSTRAINT FK_DatabaseGroupMappings_GroupFolders FOREIGN KEY ([FolderId]) 
        REFERENCES [app].[GroupFolders]([Id]) ON DELETE SET NULL;
    
    PRINT '   ✅ Columna FolderId agregada a DatabaseGroupMappings';
END
ELSE
BEGIN
    PRINT '   ✅ Columna FolderId ya existe en DatabaseGroupMappings';
END
GO

-- ==================== MIGRACIÓN 8: Índices adicionales ====================
PRINT '';
PRINT '8. Verificando índices adicionales...';

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DatabaseGroups_FolderId')
BEGIN
    PRINT '   -> Creando índice IX_DatabaseGroups_FolderId...';
    CREATE INDEX IX_DatabaseGroups_FolderId ON [app].[DatabaseGroups]([FolderId]);
    PRINT '   ✅ Índice IX_DatabaseGroups_FolderId creado';
END
ELSE
BEGIN
    PRINT '   ✅ Índice IX_DatabaseGroups_FolderId ya existe';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DatabaseGroupMappings_FolderId')
BEGIN
    PRINT '   -> Creando índice IX_DatabaseGroupMappings_FolderId...';
    CREATE INDEX IX_DatabaseGroupMappings_FolderId ON [app].[DatabaseGroupMappings]([FolderId]);
    PRINT '   ✅ Índice IX_DatabaseGroupMappings_FolderId creado';
END
ELSE
BEGIN
    PRINT '   ✅ Índice IX_DatabaseGroupMappings_FolderId ya existe';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✅ Actualización de esquema completada';
PRINT '========================================';
