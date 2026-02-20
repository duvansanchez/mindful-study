-- Script para agregar tabla GlobalSettings con soporte de notas globales
-- Ejecutar este script para añadir soporte de notas globales del módulo

USE MindfulStudy;
GO

PRINT '========================================';
PRINT 'Aplicando migración: GlobalSettings';
PRINT '========================================';
GO

-- Crear tabla GlobalSettings si no existe
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GlobalSettings' AND xtype='U')
BEGIN
    PRINT '   -> Creando tabla GlobalSettings...';
    CREATE TABLE [dbo].[GlobalSettings] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [SettingKey] NVARCHAR(255) NOT NULL UNIQUE,
        [SettingValue] NVARCHAR(MAX),
        [SettingType] NVARCHAR(50) DEFAULT 'string',
        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT CK_GlobalSettings_Key CHECK (LEN(TRIM(SettingKey)) > 0)
    );
    
    PRINT '   ✅ Tabla GlobalSettings creada exitosamente';
END
ELSE
BEGIN
    PRINT '   ✅ Tabla GlobalSettings ya existe';
END
GO

-- Crear trigger para actualizar UpdatedAt
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_GlobalSettings_UpdatedAt')
BEGIN
    PRINT '   -> Creando trigger para actualizar UpdatedAt...';
    CREATE TRIGGER TR_GlobalSettings_UpdatedAt
    ON [dbo].[GlobalSettings]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE [dbo].[GlobalSettings]
        SET UpdatedAt = GETUTCDATE()
        FROM [dbo].[GlobalSettings] gs
        INNER JOIN inserted i ON gs.Id = i.Id;
    END
    
    PRINT '   ✅ Trigger creado';
END
ELSE
BEGIN
    PRINT '   ✅ Trigger ya existe';
END
GO

PRINT '';
PRINT '========================================';
PRINT '✅ Migración completada';
PRINT '========================================';
