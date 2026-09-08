-- Telephone du destinataire et mode de recuperation de la commande.
--
-- A jouer sur une base existante AVANT de deployer le nouveau code, qui lit
-- ces colonnes. L'ancien code, lui, s'accommode de colonnes en trop : l'ordre
-- inverse laisserait le site en erreur entre les deux etapes.
--
-- Le script est rejouable : chaque ajout est garde par un test de presence.

SET NOCOUNT ON;
GO

-- Numero de telephone. Les commandes deja passees n'en ont pas : la valeur par
-- defaut evite d'avoir a les reecrire, et le back-office affiche simplement
-- une adresse sans numero.
IF COL_LENGTH('dbo.Order', 'shipPhone') IS NULL
BEGIN
    ALTER TABLE [dbo].[Order]
        ADD [shipPhone] NVARCHAR(1000) NOT NULL
        CONSTRAINT [Order_shipPhone_df] DEFAULT '';
    PRINT '  Order.shipPhone ajoute';
END
ELSE PRINT '  Order.shipPhone deja present';
GO

-- HOME : remise a l'adresse. DESK : retrait au bureau le plus proche. Les
-- commandes anterieures ont toutes ete livrees a domicile.
IF COL_LENGTH('dbo.Order', 'deliveryMode') IS NULL
BEGIN
    ALTER TABLE [dbo].[Order]
        ADD [deliveryMode] NVARCHAR(1000) NOT NULL
        CONSTRAINT [Order_deliveryMode_df] DEFAULT 'HOME';
    PRINT '  Order.deliveryMode ajoute';
END
ELSE PRINT '  Order.deliveryMode deja present';
GO

-- Tarif du retrait au bureau, par wilaya. Nul : le retrait coute le meme prix
-- que le domicile, ce qui laisse la grille utilisable des le deploiement.
IF COL_LENGTH('dbo.Wilaya', 'deskFee') IS NULL
BEGIN
    ALTER TABLE [dbo].[Wilaya] ADD [deskFee] INT NULL;
    PRINT '  Wilaya.deskFee ajoute';
END
ELSE PRINT '  Wilaya.deskFee deja present';
GO

SELECT
    (SELECT COUNT(*) FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.Order') AND name IN ('shipPhone', 'deliveryMode')) AS colonnes_commande,
    (SELECT COUNT(*) FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.Wilaya') AND name = 'deskFee') AS colonnes_wilaya,
    (SELECT COUNT(*) FROM [dbo].[Order]) AS commandes;
GO
