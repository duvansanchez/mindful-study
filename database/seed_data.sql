-- Script para insertar datos iniciales en MindfulStudy
-- Ejecutar después de create_tables.sql

USE MindfulStudy;
GO

-- Insertar configuraciones iniciales
INSERT INTO app.UserSettings (SettingKey, SettingValue, SettingType, Description)
VALUES 
    ('app_version', '1.0.0', 'string', 'Versión actual de la aplicación'),
    ('default_review_batch_size', '10', 'number', 'Número de flashcards por sesión de repaso por defecto'),
    ('auto_advance_flashcards', 'false', 'boolean', 'Avanzar automáticamente a la siguiente flashcard'),
    ('show_progress_indicators', 'true', 'boolean', 'Mostrar indicadores de progreso durante el repaso'),
    ('default_flashcard_state', 'tocado', 'string', 'Estado por defecto para nuevas flashcards'),
    ('session_timeout_minutes', '30', 'number', 'Tiempo de inactividad antes de cerrar sesión automáticamente');
GO

-- Insertar agrupaciones de ejemplo (opcional - comentado por defecto)
/*
INSERT INTO app.DatabaseGroups (Name, Color)
VALUES 
    ('Tecnología', '#3B82F6'),
    ('Idiomas', '#10B981'),
    ('Ciencias', '#8B5CF6'),
    ('Historia', '#F59E0B'),
    ('Matemáticas', '#EF4444');
GO
*/

PRINT 'Datos iniciales insertados exitosamente';
PRINT 'Base de datos lista para usar';