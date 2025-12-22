-- Script para crear la base de datos MindfulStudy en SQL Server
-- Ejecutar como administrador en SQL Server Management Studio

USE master;
GO

-- Crear la base de datos si no existe
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'MindfulStudy')
BEGIN
    CREATE DATABASE MindfulStudy
    COLLATE SQL_Latin1_General_CP1_CI_AS;
END
GO

-- Usar la base de datos
USE MindfulStudy;
GO

-- Crear esquema para la aplicación
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'app')
BEGIN
    EXEC('CREATE SCHEMA app');
END
GO

PRINT 'Base de datos MindfulStudy creada exitosamente';