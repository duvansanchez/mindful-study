-- Script para crear usuario de SQL Server para MindfulStudy
-- Ejecutar en SQL Server Management Studio como administrador

USE master;
GO

-- Habilitar SQL Server Authentication si no está habilitado
-- (Esto requiere reiniciar SQL Server después)
EXEC xp_instance_regwrite N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer', 
    N'LoginMode', REG_DWORD, 2;
GO

-- Crear login para la aplicación
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'mindful_user')
BEGIN
    CREATE LOGIN mindful_user WITH PASSWORD = 'MindfulStudy2024!';
END
GO

-- Usar la base de datos MindfulStudy
USE MindfulStudy;
GO

-- Crear usuario en la base de datos
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'mindful_user')
BEGIN
    CREATE USER mindful_user FOR LOGIN mindful_user;
END
GO

-- Asignar permisos necesarios
ALTER ROLE db_datareader ADD MEMBER mindful_user;
ALTER ROLE db_datawriter ADD MEMBER mindful_user;
ALTER ROLE db_ddladmin ADD MEMBER mindful_user;
GO

PRINT 'Usuario mindful_user creado exitosamente';
PRINT 'Password: MindfulStudy2024!';
PRINT '';
PRINT 'IMPORTANTE: Reinicia el servicio de SQL Server para habilitar SQL Authentication';
PRINT 'Luego actualiza tu archivo .env con:';
PRINT 'DB_USER=mindful_user';
PRINT 'DB_PASSWORD=MindfulStudy2024!';