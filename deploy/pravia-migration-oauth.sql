-- Pravia : migration « connexions externes » (OAuth)
--
-- A jouer sur une base DEJA installee, apres avoir mis a jour le code.
-- Purement additive : aucune donnee existante n'est touchee.
-- Relancable : chaque operation est conditionnee a l'etat de la base.
--
-- Pendant de dist-sql/pravia-migration-i18n.sql, qui ne couvre que les tables
-- de traduction. Le commit « Connexion externe » apporte deux changements que
-- cette migration-ci applique :
--   - la table Account, qui rattache un compte Google/Microsoft/Facebook/
--     TikTok/Apple a un utilisateur Pravia ;
--   - User.passwordHash devient facultatif, un compte cree par un fournisseur
--     externe n'ayant aucun mot de passe local.
--
-- Le script complet dist-sql/pravia-schema.sql part d'une base vide : le
-- rejouer en production effacerait tout. C'est pourquoi cette migration existe.
--
-- Usage :
--   sqlcmd -S localhost\SQLEXPRESS -E -C -d Pravia -b -i deploy\pravia-migration-oauth.sql

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'[dbo].[Account]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[Account] (
        [id] NVARCHAR(36) NOT NULL,
        [userId] NVARCHAR(36) NOT NULL,
        [provider] NVARCHAR(200) NOT NULL,
        [providerAccountId] NVARCHAR(36) NOT NULL,
        [email] NVARCHAR(1000),
        [displayName] NVARCHAR(1000),
        [avatarUrl] NVARCHAR(1000),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [Account_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
        [lastLoginAt] DATETIME2 NOT NULL CONSTRAINT [Account_lastLoginAt_df] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [Account_pkey] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [Account_provider_providerAccountId_key] UNIQUE NONCLUSTERED ([provider],[providerAccountId])
    );
END;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Account_userId_idx' AND object_id = OBJECT_ID(N'[dbo].[Account]'))
    CREATE NONCLUSTERED INDEX [Account_userId_idx] ON [dbo].[Account]([userId]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'Account_provider_idx' AND object_id = OBJECT_ID(N'[dbo].[Account]'))
    CREATE NONCLUSTERED INDEX [Account_provider_idx] ON [dbo].[Account]([provider]);

IF OBJECT_ID(N'[dbo].[Account_userId_fkey]', N'F') IS NULL
    ALTER TABLE [dbo].[Account] ADD CONSTRAINT [Account_userId_fkey]
        FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- Un compte cree par connexion externe n'a pas de mot de passe local : la
-- colonne doit accepter NULL. La longueur ne change pas, seule la nullabilite.
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'[dbo].[User]') AND name = N'passwordHash' AND is_nullable = 0
)
    ALTER TABLE [dbo].[User] ALTER COLUMN [passwordHash] NVARCHAR(1000) NULL;

COMMIT TRANSACTION;

-- Verification : la table, ses deux index, sa cle etrangere, et la nullabilite.
SELECT name FROM sys.tables WHERE name = N'Account';
SELECT name FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[Account]') AND name IS NOT NULL ORDER BY name;
SELECT 'passwordHash nullable = ' + CAST(is_nullable AS varchar) FROM sys.columns
 WHERE object_id = OBJECT_ID(N'[dbo].[User]') AND name = N'passwordHash';
