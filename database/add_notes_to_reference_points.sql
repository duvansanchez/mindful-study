-- Agregar campo de notas a la tabla ReferencePoints
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'ReferencePoints' AND COLUMN_NAME = 'notes')
BEGIN
    ALTER TABLE ReferencePoints 
    ADD notes NVARCHAR(MAX) NULL;
    
    PRINT '✅ Campo "notes" agregado a la tabla ReferencePoints';
END
ELSE
BEGIN
    PRINT '⚠️ Campo "notes" ya existe en la tabla ReferencePoints';
END