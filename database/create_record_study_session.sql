USE MindfulStudy;
GO

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
    IF EXISTS (SELECT 1 FROM app.DailyStudyStats 
               WHERE StudyDate = @StudyDate 
               AND ISNULL(GroupId, '') = ISNULL(@GroupId, '') 
               AND ISNULL(DatabaseId, '') = ISNULL(@DatabaseId, ''))
    BEGIN
        UPDATE app.DailyStudyStats 
        SET FlashcardsStudied = FlashcardsStudied + 1,
            TotalStudyTimeSeconds = TotalStudyTimeSeconds + @StudyDurationSeconds,
            StateChangesTocado = StateChangesTocado + CASE WHEN @NewState = 'tocado' THEN 1 ELSE 0 END,
            StateChangesToVerde = StateChangesToVerde + CASE WHEN @NewState = 'verde' THEN 1 ELSE 0 END,
            StateChangesToSolido = StateChangesToSolido + CASE WHEN @NewState = 'solido' THEN 1 ELSE 0 END,
            UpdatedAt = GETUTCDATE()
        WHERE StudyDate = @StudyDate 
        AND ISNULL(GroupId, '') = ISNULL(@GroupId, '') 
        AND ISNULL(DatabaseId, '') = ISNULL(@DatabaseId, '');
    END
    ELSE
    BEGIN
        INSERT INTO app.DailyStudyStats (StudyDate, GroupId, DatabaseId, FlashcardsStudied, TotalStudyTimeSeconds,
                                        StateChangesTocado, StateChangesToVerde, StateChangesToSolido)
        VALUES (@StudyDate, @GroupId, @DatabaseId, 1, @StudyDurationSeconds,
                CASE WHEN @NewState = 'tocado' THEN 1 ELSE 0 END,
                CASE WHEN @NewState = 'verde' THEN 1 ELSE 0 END,
                CASE WHEN @NewState = 'solido' THEN 1 ELSE 0 END);
    END;
END;
GO

PRINT 'Procedimiento RecordStudySession creado exitosamente.';