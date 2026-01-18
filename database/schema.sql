-- Schema Definition
CREATE SCHEMA [Trade];
GO

-- 1. Exchanges (Tenants / Simulation Venues)
CREATE TABLE [Trade].[Exchanges] (
    [ExchangeId] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [CreatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    [CreatedBy] UNIQUEIDENTIFIER NOT NULL -- Entra Object ID of creator
);
GO

-- 2. Exchange RBAC (Multi-User, Multi-Role)
CREATE TABLE [Trade].[ExchangeRoles] (
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]),
    [UserId] UNIQUEIDENTIFIER NOT NULL, -- Entra Object ID
    [Role] NVARCHAR(50) NOT NULL CHECK ([Role] IN ('RiskManager', 'PortfolioManager', 'Analyst')),
    [AssignedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY ([ExchangeId], [UserId], [Role])
);
GO

-- 3. Configuration (1:1 with Exchange)
CREATE TABLE [Trade].[ExchangeConfigurations] (
    [ExchangeId] UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]),
    [VolatilityIndex] DECIMAL(5, 2) DEFAULT 1.0, -- 1.0 = Normal, 2.0 = High/Crisis
    [StartingCash] MONEY DEFAULT 10000000.00, -- Initial AUM
    [Commission] MONEY DEFAULT 5.00, -- Institutional Commission per Trade
    [AllowMargin] BIT DEFAULT 1,
    [MaxPortfolioSize] INT DEFAULT 50,
    [DashboardLayout] NVARCHAR(MAX) CHECK (ISJSON([DashboardLayout]) = 1) DEFAULT '[]' -- JSON Array of Widget IDs
);
GO

-- 4. Global Instruments (Shared)
CREATE TABLE [Trade].[Instruments] (
    [Symbol] NVARCHAR(10) PRIMARY KEY,
    [CompanyName] NVARCHAR(100) NOT NULL,
    [Sector] NVARCHAR(50),
    [BasePrice] DECIMAL(18, 2) NOT NULL -- Reference price for simulation start
);
GO

-- 5. Portfolios (RLS Target)
CREATE TABLE [Trade].[Portfolios] (
    [PortfolioId] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]),
    [UserId] UNIQUEIDENTIFIER NOT NULL, -- Entra Object ID (Portfolio Manager)
    [CashBalance] MONEY NOT NULL,
    [CreatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX [IX_Portfolios_ExchangeId] ([ExchangeId]),
    INDEX [IX_Portfolios_UserId] ([UserId])
);
GO

-- 6. Positions (Holdings)
CREATE TABLE [Trade].[Positions] (
    [PositionId] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [PortfolioId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Portfolios]([PortfolioId]),
    [Symbol] NVARCHAR(10) NOT NULL FOREIGN KEY REFERENCES [Trade].[Instruments]([Symbol]),
    [Quantity] DECIMAL(18, 4) NOT NULL,
    [AverageCost] DECIMAL(18, 2) NOT NULL,
    INDEX [IX_Positions_PortfolioId] ([PortfolioId])
);
GO

-- 7. Order History (Matching Engine Target)
CREATE TABLE [Trade].[Orders] (
    [OrderId] UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    [PortfolioId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Portfolios]([PortfolioId]),
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL, -- Denormalized for RLS efficiency
    [Symbol] NVARCHAR(10) NOT NULL,
    [Side] NVARCHAR(10) NOT NULL CHECK ([Side] IN ('BUY', 'SELL', 'SHORT', 'COVER')),
    [Type] NVARCHAR(10) NOT NULL CHECK ([Type] IN ('MARKET', 'LIMIT', 'STOP')),
    [Status] NVARCHAR(20) NOT NULL DEFAULT 'PENDING',
    [Quantity] DECIMAL(18, 4) NOT NULL,
    [LimitPrice] DECIMAL(18, 2) NULL,
    [ExecutedPrice] DECIMAL(18, 2) NULL,
    [Timestamp] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    INDEX [IX_Orders_Exchange_Status] ([ExchangeId], [Status]) INCLUDE ([Symbol])
);
GO

-- 8. Aggregated Candles (Hot Path Storage)
CREATE TABLE [Trade].[OHLC_1M] (
    [CandleId] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]),
    [Symbol] NVARCHAR(10) NOT NULL,
    [Timestamp] DATETIMEOFFSET NOT NULL,
    [Open] DECIMAL(18, 2) NOT NULL,
    [High] DECIMAL(18, 2) NOT NULL,
    [Low] DECIMAL(18, 2) NOT NULL,
    [Close] DECIMAL(18, 2) NOT NULL,
    [Volume] INT DEFAULT 0,
    INDEX [IX_OHLC_Exchange_Symbol_Time] ([ExchangeId], [Symbol], [Timestamp])
);
GO

-- Row Level Security (RLS) Implementation
-- 1. Create Schema for Security
CREATE SCHEMA [Security];
GO

-- 2. Predicate Function
-- Returns 1 if the user accesses data for their current 'Session Context' Exchange
CREATE FUNCTION [Security].[fn_securitypredicate](@ExchangeId AS UNIQUEIDENTIFIER)
    RETURNS TABLE
WITH SCHEMABINDING
AS
    RETURN SELECT 1 AS [fn_securitypredicate_result]
    WHERE
        -- App sends ExchangeId in SESSION_CONTEXT
        @ExchangeId = CAST(SESSION_CONTEXT(N'ExchangeId') AS UNIQUEIDENTIFIER)
        AND (
            -- User is a Super Admin
            CAST(SESSION_CONTEXT(N'IsSuperAdmin') AS BIT) = 1
            OR
            -- User has a role in this exchange (Admin or Trader)
            EXISTS (
                SELECT 1 FROM [Trade].[ExchangeRoles] r
                WHERE r.ExchangeId = @ExchangeId
                AND r.UserId = CAST(SESSION_CONTEXT(N'UserId') AS UNIQUEIDENTIFIER)
            )
        );
GO

-- 3. Apply Policy to Portfolios
CREATE SECURITY POLICY [Security].[PortfolioPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[Portfolios],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[Portfolios]
    WITH (STATE = ON);
GO

-- 4. Apply Policy to Orders
CREATE SECURITY POLICY [Security].[OrderPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[Orders],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[Orders]
    WITH (STATE = ON);
GO

-- 5. Apply Policy to OHLC data
CREATE SECURITY POLICY [Security].[OHLCPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[OHLC_1M],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[OHLC_1M]
    WITH (STATE = ON);
GO
