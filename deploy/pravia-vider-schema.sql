-- Pravia : remise a zero complete du schema.
--
-- A n'employer que pour repartir d'une base propre, quand la structure a trop
-- change pour une migration additive — passage au dinar, refonte des adresses,
-- decoupage administratif algerien. Le script complet dist-sql\pravia-schema.sql
-- part d'une base vide : celui-ci l'y ramene.
--
-- ATTENTION : toutes les donnees sont perdues. La base, ses droits et le compte
-- applicatif sont en revanche conserves, ce qui evite de rejouer
-- 1-configurer-sqlserver.ps1 et de retoucher .env.production.
--
-- Usage :
--   sqlcmd -S localhost\SQLEXPRESS -E -C -d Pravia -b -i deploy\pravia-vider-schema.sql

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @sql NVARCHAR(MAX);

-- Les cles etrangeres d'abord : sans cela l'ordre de suppression des tables
-- deviendrait un casse-tete, et une seule dependance oubliee ferait echouer
-- l'ensemble.
SELECT @sql = STRING_AGG(
    CAST('ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(t.schema_id)) + '.' + QUOTENAME(t.name)
       + ' DROP CONSTRAINT ' + QUOTENAME(f.name) + ';' AS NVARCHAR(MAX)), CHAR(10))
FROM sys.foreign_keys f
JOIN sys.tables t ON t.object_id = f.parent_object_id;

IF @sql IS NOT NULL EXEC sp_executesql @sql;
PRINT 'Cles etrangeres supprimees';

SELECT @sql = STRING_AGG(
    CAST('DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + ';' AS NVARCHAR(MAX)), CHAR(10))
FROM sys.tables;

IF @sql IS NOT NULL EXEC sp_executesql @sql;
PRINT 'Tables supprimees';

SELECT 'tables restantes = ' + CAST(COUNT(*) AS varchar) FROM sys.tables;
