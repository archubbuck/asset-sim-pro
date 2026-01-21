# Data Module - ARCHITECTURE.md L443-L495
# Implements secure database infrastructure with:
# - Azure SQL Server with system-assigned managed identity
# - Elastic pool for efficient resource sharing across databases
# - SQL database within the elastic pool
# - Private endpoint for Zero Trust network access
# - Public network access disabled for security

resource "azurerm_mssql_server" "sql" {
  name                          = "sql-assetsim-${var.environment}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "12.0"
  administrator_login           = var.sql_admin_username
  administrator_login_password  = var.sql_admin_password
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

resource "azurerm_mssql_elasticpool" "pool" {
  name                = "ep-assetsim-${var.environment}"
  resource_group_name = var.resource_group_name
  location            = var.location
  server_name         = azurerm_mssql_server.sql.name
  license_type        = "LicenseIncluded"
  max_size_gb         = 50

  sku {
    name     = "StandardPool"
    tier     = "Standard"
    capacity = 50
  }

  per_database_settings {
    min_capacity = 0
    max_capacity = 50
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

resource "azurerm_mssql_database" "db" {
  name            = "sqldb-assetsim"
  server_id       = azurerm_mssql_server.sql.id
  elastic_pool_id = azurerm_mssql_elasticpool.pool.id

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

resource "azurerm_private_endpoint" "sql_pe" {
  name                = "pe-sql"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-sql"
    private_connection_resource_id = azurerm_mssql_server.sql.id
    subresource_names              = ["sqlServer"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "pdzg-sql"
    private_dns_zone_ids = [var.private_dns_zone_sql_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}
