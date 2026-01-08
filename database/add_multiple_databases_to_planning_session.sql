-- Agregar soporte para múltiples bases de datos en sesiones de planificación
-- Esta migración agrega la columna DatabaseIds para almacenar múltiples bases de datos

-- Verificar si la columna DatabaseIds ya existe
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('PlanningSession') AND name = 'DatabaseIds')
BEGIN
    -- Agregar la nueva columna
    ALTER TABLE PlanningSession ADD DatabaseIds NVARCHAR(MAX);
    
    -- Migrar datos existentes: convertir DatabaseId individual a array JSON
    UPDATE PlanningSession 
    SET DatabaseIds = '["' + DatabaseId + '"]'
    WHERE DatabaseIds IS NULL AND DatabaseId IS NOT NULL;
    
    PRINT 'Columna DatabaseIds agregada a PlanningSession y datos migrados exitosamente';
END
ELSE
BEGIN
    PRINT 'Columna DatabaseIds ya existe en PlanningSession';
END