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
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]) ON DELETE CASCADE,
    [UserId] UNIQUEIDENTIFIER NOT NULL, -- Entra Object ID
    [Role] NVARCHAR(50) NOT NULL CHECK ([Role] IN ('RiskManager', 'PortfolioManager', 'Analyst')),
    [AssignedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY ([ExchangeId], [UserId], [Role])
);
GO

-- 3. Configuration (1:1 with Exchange)
CREATE TABLE [Trade].[ExchangeConfigurations] (
    [ExchangeId] UNIQUEIDENTIFIER PRIMARY KEY FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]) ON DELETE CASCADE,
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
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]), -- Denormalized for RLS efficiency
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

-- 8. Raw Market Data (ADR-010: Source for aggregation, archived to cold storage)
CREATE TABLE [Trade].[MarketData] (
    [TickId] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]),
    [Symbol] NVARCHAR(10) NOT NULL,
    [Timestamp] DATETIMEOFFSET NOT NULL,
    [Open] DECIMAL(18, 8) NOT NULL,
    [High] DECIMAL(18, 8) NOT NULL,
    [Low] DECIMAL(18, 8) NOT NULL,
    [Close] DECIMAL(18, 8) NOT NULL,
    [Volume] BIGINT DEFAULT 0,
    INDEX [IX_MarketData_Exchange_Symbol_Time] ([ExchangeId], [Symbol], [Timestamp])
);
GO

-- 9. Aggregated Candles (ADR-010: Hot Path Storage - 7 day retention)
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

-- 5. Apply Policy to MarketData
CREATE SECURITY POLICY [Security].[MarketDataPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[MarketData],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[MarketData]
    WITH (STATE = ON);
GO

-- 6. Apply Policy to OHLC data
CREATE SECURITY POLICY [Security].[OHLCPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[OHLC_1M],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[OHLC_1M]
    WITH (STATE = ON);
GO

-- 10. Exchange Feature Flags (ADR-008: Multi-Tenancy Feature Management)
CREATE TABLE [Trade].[ExchangeFeatureFlags] (
    [ExchangeId] UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES [Trade].[Exchanges]([ExchangeId]) ON DELETE CASCADE,
    [FeatureName] NVARCHAR(100) NOT NULL,
    [IsEnabled] BIT NOT NULL DEFAULT 0,
    [UpdatedAt] DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY ([ExchangeId], [FeatureName]),
    INDEX [IX_ExchangeFeatureFlags_ExchangeId] ([ExchangeId])
);
GO

-- 7. Apply RLS Policy to Exchange Feature Flags (RLS Policy #7)
CREATE SECURITY POLICY [Security].[ExchangeFeatureFlagsPolicy]
    ADD FILTER PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[ExchangeFeatureFlags],
    ADD BLOCK PREDICATE [Security].[fn_securitypredicate]([ExchangeId]) ON [Trade].[ExchangeFeatureFlags]
    WITH (STATE = ON);
GO

-- ADR-010: Data Retention & Lifecycle Management Stored Procedures

-- Aggregate raw ticks into 1-minute OHLC candles
CREATE PROCEDURE [Trade].[sp_AggregateOHLC_1M]
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Find the last aggregated timestamp
    DECLARE @LastAggregated DATETIMEOFFSET;
    SELECT @LastAggregated = ISNULL(MAX([Timestamp]), '1900-01-01')
    FROM [Trade].[OHLC_1M];
    
    -- Aggregate raw ticks into 1-minute candles for data after last aggregation
    INSERT INTO [Trade].[OHLC_1M] ([ExchangeId], [Symbol], [Timestamp], [Open], [High], [Low], [Close], [Volume])
    SELECT 
        [ExchangeId],
        [Symbol],
        DATEADD(MINUTE, DATEDIFF(MINUTE, 0, [Timestamp]), 0) AS [Timestamp], -- Round down to minute
        CAST(MIN(CASE WHEN rn = 1 THEN [Open] END) AS DECIMAL(18, 2)) AS [Open], -- First tick's open in minute
        CAST(MAX([High]) AS DECIMAL(18, 2)) AS [High],
        CAST(MIN([Low]) AS DECIMAL(18, 2)) AS [Low],
        CAST(MAX(CASE WHEN rn_desc = 1 THEN [Close] END) AS DECIMAL(18, 2)) AS [Close], -- Last tick's close in minute
        CAST(SUM([Volume]) AS INT) AS [Volume]
    FROM (
        SELECT 
            *,
            ROW_NUMBER() OVER (PARTITION BY [ExchangeId], [Symbol], DATEADD(MINUTE, DATEDIFF(MINUTE, 0, [Timestamp]), 0) ORDER BY [Timestamp] ASC) as rn,
            ROW_NUMBER() OVER (PARTITION BY [ExchangeId], [Symbol], DATEADD(MINUTE, DATEDIFF(MINUTE, 0, [Timestamp]), 0) ORDER BY [Timestamp] DESC) as rn_desc
        FROM [Trade].[MarketData]
        WHERE [Timestamp] > @LastAggregated
    ) AS RankedData
    GROUP BY [ExchangeId], [Symbol], DATEADD(MINUTE, DATEDIFF(MINUTE, 0, [Timestamp]), 0)
    ORDER BY [Timestamp];
    
    RETURN @@ROWCOUNT;
END;
GO

-- Clean up hot path data older than 7 days (OHLC_1M retention policy)
CREATE PROCEDURE [Trade].[sp_CleanupHotPath]
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @RetentionDays INT = 7;
    DECLARE @CutoffDate DATETIMEOFFSET = DATEADD(DAY, -@RetentionDays, SYSDATETIMEOFFSET());
    
    DELETE FROM [Trade].[OHLC_1M]
    WHERE [Timestamp] < @CutoffDate;
    
    RETURN @@ROWCOUNT;
END;
GO
