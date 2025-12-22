-- Script para crear las tablas de la aplicación MindfulStudy
-- Ejecutar después de create_database.sql

USE MindfulStudy;
GO

-- Tabla para almacenar agrupaciones de bases de datos
CREATE TABLE app.DatabaseGroups (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(255) NOT NULL,
    Color NVARCHAR(50) NOT NULL DEFAULT '#3B82F6', -- Color en formato hex
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    IsActive BIT DEFAULT 1,
    
    CONSTRAINT CK_DatabaseGroups_Name_NotEmpty CHECK (LEN(TRIM(Name)) > 0),
    CONSTRAINT CK_DatabaseGroups_Color_Format CHECK (Color LIKE '#%' AND LEN(Color) = 7)
);
GO

-- Tabla para relacionar bases de datos con agrupaciones
CREATE TABLE app.DatabaseGroupMappings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    GroupId UNIQUEIDENTIFIER NOT NULL,
    NotionDatabaseId NVARCHAR(255) NOT NULL, -- ID de la base de datos de Notion
    NotionDatabaseName NVARCHAR(500), -- Nombre de la base de datos para referencia
    AddedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT FK_DatabaseGroupMappings_Group 
        FOREIGN KEY (GroupId) REFERENCES app.DatabaseGroups(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_DatabaseGroupMappings_GroupDatabase 
        UNIQUE (GroupId, NotionDatabaseId)
);
GO

-- Tabla para configuraciones de usuario
CREATE TABLE app.UserSettings (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    SettingKey NVARCHAR(100) NOT NULL UNIQUE,
    SettingValue NVARCHAR(MAX),
    SettingType NVARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    Description NVARCHAR(500),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    CONSTRAINT CK_UserSettings_Key_NotEmpty CHECK (LEN(TRIM(SettingKey)) > 0)
);
GO

-- Tabla para estadísticas y métricas de estudio
CREATE TABLE app.StudyStats (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    NotionDatabaseId NVARCHAR(255) NOT NULL,
    FlashcardId NVARCHAR(255) NOT NULL,
    StatType NVARCHAR(50) NOT NULL, -- 'view', 'review', 'state_change'
    StatValue NVARCHAR(255), -- Valor del evento (ej: 'tocado' -> 'verde')
    Timestamp DATETIME2 DEFAULT GETUTCDATE(),
    SessionId UNIQUEIDENTIFIER, -- Para agrupar actividades de una sesión
    
    CONSTRAINT CK_StudyStats_Type_Valid 
        CHECK (StatType IN ('view', 'review', 'state_change', 'note_added'))
);
GO

-- Tabla para notas de repaso personalizadas
CREATE TABLE app.ReviewNotes (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FlashcardId NVARCHAR(255) NOT NULL,
    NotionDatabaseId NVARCHAR(255) NOT NULL,
    NoteContent NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    SessionId UNIQUEIDENTIFIER,
    
    CONSTRAINT CK_ReviewNotes_Content_NotEmpty CHECK (LEN(TRIM(NoteContent)) > 0)
);
GO

-- Índices para mejorar rendimiento
CREATE INDEX IX_DatabaseGroupMappings_GroupId ON app.DatabaseGroupMappings(GroupId);
CREATE INDEX IX_DatabaseGroupMappings_NotionDatabaseId ON app.DatabaseGroupMappings(NotionDatabaseId);
CREATE INDEX IX_StudyStats_DatabaseId_FlashcardId ON app.StudyStats(NotionDatabaseId, FlashcardId);
CREATE INDEX IX_StudyStats_Timestamp ON app.StudyStats(Timestamp);
CREATE INDEX IX_ReviewNotes_FlashcardId ON app.ReviewNotes(FlashcardId);
CREATE INDEX IX_ReviewNotes_DatabaseId ON app.ReviewNotes(NotionDatabaseId);
GO

-- Trigger para actualizar UpdatedAt en DatabaseGroups
CREATE TRIGGER TR_DatabaseGroups_UpdatedAt
ON app.DatabaseGroups
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE app.DatabaseGroups 
    SET UpdatedAt = GETUTCDATE()
    FROM app.DatabaseGroups dg
    INNER JOIN inserted i ON dg.Id = i.Id;
END
GO

-- Trigger para actualizar UpdatedAt en UserSettings
CREATE TRIGGER TR_UserSettings_UpdatedAt
ON app.UserSettings
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE app.UserSettings 
    SET UpdatedAt = GETUTCDATE()
    FROM app.UserSettings us
    INNER JOIN inserted i ON us.Id = i.Id;
END
GO

PRINT 'Tablas creadas exitosamente';
PRINT 'Estructura de base de datos lista para MindfulStudy';