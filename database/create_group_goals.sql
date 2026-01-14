-- Script para crear tabla de metas/objetivos de agrupaciones
-- Ejecutar en SQL Server Management Studio o con sqlcmd

USE MindfulStudy;
GO

-- Crear tabla de metas de agrupaciones
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[app].[GroupGoals]') AND type in (N'U'))
BEGIN
    CREATE TABLE [app].[GroupGoals] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [Title] NVARCHAR(500) NOT NULL,
        [Description] NVARCHAR(MAX) NULL,
        [Completed] BIT NOT NULL DEFAULT 0,
        [DueDate] DATE NULL,
        [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_GroupGoals_Group 
            FOREIGN KEY ([GroupId]) REFERENCES [app].[DatabaseGroups]([Id]) ON DELETE CASCADE,
        CONSTRAINT CK_GroupGoals_Title_NotEmpty 
            CHECK (LEN(TRIM([Title])) > 0)
    );
    
    PRINT 'Tabla GroupGoals creada exitosamente';
END
ELSE
BEGIN
    PRINT 'La tabla GroupGoals ya existe';
END
GO

-- Crear índices para mejorar el rendimiento
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GroupGoals_GroupId')
BEGIN
    CREATE INDEX IX_GroupGoals_GroupId ON [app].[GroupGoals]([GroupId]);
    PRINT 'Índice IX_GroupGoals_GroupId creado';
END

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GroupGoals_Completed')
BEGIN
    CREATE INDEX IX_GroupGoals_Completed ON [app].[GroupGoals]([Completed]);
    PRINT 'Índice IX_GroupGoals_Completed creado';
END
GO
