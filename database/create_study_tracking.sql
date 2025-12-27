-- Crear tabla para tracking de estudio de flashcards
USE MindfulStudy;
GO

-- Tabla para registrar cada sesión de estudio de una flashcard
CREATE TABLE app.StudySessions (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    FlashcardId NVARCHAR(255) NOT NULL, -- ID de la flashcard de Notion
    DatabaseId NVARCHAR(255) NOT NULL,  -- ID de la base de datos de Notion
    GroupId UNIQUEIDENTIFIER NULL,      -- ID de la agrupación (puede ser NULL si no está en grupo)
    StudiedAt DATETIME2 DEFAULT GETUTCDATE(),
    PreviousState NVARCHAR(50) NOT NULL, -- Estado antes del estudio
    NewState NVARCHAR(50) NOT NULL,      -- Estado después del estudio
    StudyDurationSeconds INT DEFAULT 0,  -- Duración del estudio en segundos
    ReviewNotes NVARCHAR(MAX) NULL      -- Notas del repaso
);
GO

-- Crear índices por separado
CREATE INDEX IX_StudySessions_FlashcardId ON app.StudySessions (FlashcardId);
CREATE INDEX IX_StudySessions_DatabaseId ON app.StudySessions (DatabaseId);
CREATE INDEX IX_StudySessions_GroupId ON app.StudySessions (GroupId);
CREATE INDEX IX_StudySessions_StudiedAt ON app.StudySessions (StudiedAt);
CREATE INDEX IX_StudySessions_StudiedAt_GroupId ON app.StudySessions (StudiedAt, GroupId);
GO

-- Tabla para estadísticas agregadas por día (para consultas rápidas)
CREATE TABLE app.DailyStudyStats (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    StudyDate DATE NOT NULL,
    GroupId UNIQUEIDENTIFIER NULL,
    DatabaseId NVARCHAR(255) NULL,
    FlashcardsStudied INT DEFAULT 0,
    TotalStudyTimeSeconds INT DEFAULT 0,
    StateChangesTocado INT DEFAULT 0,
    StateChangesToVerde INT DEFAULT 0,
    StateChangesToSolido INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    UpdatedAt DATETIME2 DEFAULT GETUTCDATE()
);
GO

-- Crear índices por separado
CREATE UNIQUE INDEX IX_DailyStudyStats_Date_Group ON app.DailyStudyStats (StudyDate, GroupId, DatabaseId);
CREATE INDEX IX_DailyStudyStats_StudyDate ON app.DailyStudyStats (StudyDate);
CREATE INDEX IX_DailyStudyStats_GroupId ON app.DailyStudyStats (GroupId);
GO

-- Procedimiento para registrar una sesión de estudio
CREATE PROCEDURE app.RecordStudySession
    @FlashcardId NVARCHAR(255),
    @DatabaseId NVARCHAR(255),
    @GroupId UNIQUEIDENTIFIER = NULL,
    @PreviousState NVARCHAR(50),
    @NewState NVARCHAR(50),
    @StudyDurationSeconds INT = 0,
    @ReviewNotes NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @StudyDate DATE = CAST(GETUTCDATE() AS DATE);
    
    -- Insertar sesión de estudio
    INSERT INTO app.StudySessions (
        FlashcardId, DatabaseId, GroupId, PreviousState, NewState, 
        StudyDurationSeconds, ReviewNotes
    )
    VALUES (
        @FlashcardId, @DatabaseId, @GroupId, @PreviousState, @NewState,
        @StudyDurationSeconds, @ReviewNotes
    );
    
    -- Actualizar estadísticas diarias
    MERGE app.DailyStudyStats AS target
    USING (
        SELECT 
            @StudyDate AS StudyDate,
            @GroupId AS GroupId,
            @DatabaseId AS DatabaseId,
            1 AS FlashcardsStudied,
            @StudyDurationSeconds AS TotalStudyTimeSeconds,
            CASE WHEN @NewState = 'tocado' THEN 1 ELSE 0 END AS StateChangesTocado,
            CASE WHEN @NewState = 'verde' THEN 1 ELSE 0 END AS StateChangesToVerde,
            CASE WHEN @NewState = 'solido' THEN 1 ELSE 0 END AS StateChangesToSolido
    ) AS source ON (
        target.StudyDate = source.StudyDate 
        AND target.GroupId = source.GroupId 
        AND target.DatabaseId = source.DatabaseId
    )
    WHEN MATCHED THEN
        UPDATE SET
            FlashcardsStudied = target.FlashcardsStudied + source.FlashcardsStudied,
            TotalStudyTimeSeconds = target.TotalStudyTimeSeconds + source.TotalStudyTimeSeconds,
            StateChangesTocado = target.StateChangesTocado + source.StateChangesTocado,
            StateChangesToVerde = target.StateChangesToVerde + source.StateChangesToVerde,
            StateChangesToSolido = target.StateChangesToSolido + source.StateChangesToSolido,
            UpdatedAt = GETUTCDATE()
    WHEN NOT MATCHED THEN
        INSERT (StudyDate, GroupId, DatabaseId, FlashcardsStudied, TotalStudyTimeSeconds,
                StateChangesTocado, StateChangesToVerde, StateChangesToSolido)
        VALUES (source.StudyDate, source.GroupId, source.DatabaseId, source.FlashcardsStudied,
                source.TotalStudyTimeSeconds, source.StateChangesTocado, source.StateChangesToVerde,
                source.StateChangesToSolido);
END;
GO

-- Función para obtener estadísticas de estudio por período
CREATE FUNCTION app.GetStudyStatsByPeriod(
    @GroupId UNIQUEIDENTIFIER = NULL,
    @DatabaseId NVARCHAR(255) = NULL,
    @PeriodType NVARCHAR(10) = 'day', -- 'day', 'week', 'month'
    @PeriodOffset INT = 0 -- 0 = actual, -1 = anterior, etc.
)
RETURNS TABLE
AS
RETURN
(
    WITH PeriodDates AS (
        SELECT 
            CASE 
                WHEN @PeriodType = 'day' THEN DATEADD(day, @PeriodOffset, CAST(GETUTCDATE() AS DATE))
                WHEN @PeriodType = 'week' THEN DATEADD(week, @PeriodOffset, DATEADD(day, -(DATEPART(weekday, GETUTCDATE()) - 1), CAST(GETUTCDATE() AS DATE)))
                WHEN @PeriodType = 'month' THEN DATEADD(month, @PeriodOffset, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
            END AS StartDate,
            CASE 
                WHEN @PeriodType = 'day' THEN DATEADD(day, @PeriodOffset + 1, CAST(GETUTCDATE() AS DATE))
                WHEN @PeriodType = 'week' THEN DATEADD(week, @PeriodOffset + 1, DATEADD(day, -(DATEPART(weekday, GETUTCDATE()) - 1), CAST(GETUTCDATE() AS DATE)))
                WHEN @PeriodType = 'month' THEN DATEADD(month, @PeriodOffset + 1, DATEFROMPARTS(YEAR(GETUTCDATE()), MONTH(GETUTCDATE()), 1))
            END AS EndDate
    )
    SELECT 
        ISNULL(SUM(FlashcardsStudied), 0) AS FlashcardsStudied,
        ISNULL(SUM(TotalStudyTimeSeconds), 0) AS TotalStudyTimeSeconds,
        ISNULL(SUM(StateChangesTocado), 0) AS StateChangesTocado,
        ISNULL(SUM(StateChangesToVerde), 0) AS StateChangesToVerde,
        ISNULL(SUM(StateChangesToSolido), 0) AS StateChangesToSolido,
        COUNT(DISTINCT StudyDate) AS StudyDays
    FROM app.DailyStudyStats ds
    CROSS JOIN PeriodDates pd
    WHERE ds.StudyDate >= pd.StartDate 
        AND ds.StudyDate < pd.EndDate
        AND (@GroupId IS NULL OR ds.GroupId = @GroupId)
        AND (@DatabaseId IS NULL OR ds.DatabaseId = @DatabaseId)
);
GO

PRINT 'Tablas y procedimientos de tracking de estudio creados exitosamente.';