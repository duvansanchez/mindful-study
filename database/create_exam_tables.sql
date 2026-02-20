-- Script para agregar tablas de exámenes
-- Ejecutar este script para añadir soporte de exámenes

USE MindfulStudy;
GO

PRINT '========================================';
PRINT 'Creando tablas para módulo de Exámenes';
PRINT '========================================';
GO

-- Tabla para almacenar documentos de exámenes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ExamDocuments' AND xtype='U')
BEGIN
    PRINT '   -> Creando tabla ExamDocuments...';
    CREATE TABLE [dbo].[ExamDocuments] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [ExamName] NVARCHAR(255) NOT NULL,
        [Description] NVARCHAR(MAX),
        [ExamData] NVARCHAR(MAX) NOT NULL, -- JSON con preguntas
        [TimeLimit] INT DEFAULT 0, -- segundos, 0 = sin límite
        [TotalQuestions] INT NOT NULL,
        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
        [UpdatedAt] DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_ExamDocuments_Group FOREIGN KEY (GroupId) 
            REFERENCES app.DatabaseGroups(Id) ON DELETE CASCADE,
        CONSTRAINT CK_ExamDocuments_Name CHECK (LEN(TRIM(ExamName)) > 0)
    );
    
    CREATE INDEX IX_ExamDocuments_GroupId ON [dbo].[ExamDocuments](GroupId);
    PRINT '   ✅ Tabla ExamDocuments creada';
END
ELSE
BEGIN
    PRINT '   ✅ Tabla ExamDocuments ya existe';
END
GO

-- Tabla para almacenar intentos de exámenes
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ExamAttempts' AND xtype='U')
BEGIN
    PRINT '   -> Creando tabla ExamAttempts...';
    CREATE TABLE [dbo].[ExamAttempts] (
        [Id] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        [ExamDocumentId] UNIQUEIDENTIFIER NOT NULL,
        [GroupId] UNIQUEIDENTIFIER NOT NULL,
        [ExamName] NVARCHAR(255),
        [TotalQuestions] INT NOT NULL,
        [CorrectAnswers] INT NOT NULL DEFAULT 0,
        [Score] DECIMAL(5,2), -- Porcentaje
        [Answers] NVARCHAR(MAX), -- JSON con respuestas dadas
        [Duration] INT, -- segundos
        [CreatedAt] DATETIME2 DEFAULT GETUTCDATE(),
        
        CONSTRAINT FK_ExamAttempts_Document FOREIGN KEY (ExamDocumentId)
            REFERENCES [dbo].[ExamDocuments](Id) ON DELETE CASCADE,
        CONSTRAINT FK_ExamAttempts_Group FOREIGN KEY (GroupId)
            REFERENCES app.DatabaseGroups(Id) ON DELETE NO ACTION,
        CONSTRAINT CK_ExamAttempts_Score CHECK (Score >= 0 AND Score <= 100)
    );
    
    CREATE INDEX IX_ExamAttempts_ExamDocumentId ON [dbo].[ExamAttempts](ExamDocumentId);
    CREATE INDEX IX_ExamAttempts_GroupId ON [dbo].[ExamAttempts](GroupId);
    CREATE INDEX IX_ExamAttempts_CreatedAt ON [dbo].[ExamAttempts](CreatedAt);
    PRINT '   ✅ Tabla ExamAttempts creada';
END
ELSE
BEGIN
    PRINT '   ✅ Tabla ExamAttempts ya existe';
END
GO

-- Trigger para actualizar UpdatedAt en ExamDocuments
IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'TR_ExamDocuments_UpdatedAt')
BEGIN
    PRINT '   -> Creando trigger para ExamDocuments...';
    CREATE TRIGGER TR_ExamDocuments_UpdatedAt
    ON [dbo].[ExamDocuments]
    AFTER UPDATE
    AS
    BEGIN
        SET NOCOUNT ON;
        UPDATE [dbo].[ExamDocuments]
        SET UpdatedAt = GETUTCDATE()
        FROM [dbo].[ExamDocuments] ed
        INNER JOIN inserted i ON ed.Id = i.Id;
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
PRINT '✅ Tablas de exámenes creadas exitosamente';
PRINT '========================================';
