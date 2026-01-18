resource "azurerm_mssql_server" "sql" {
  name                          = "sql-assetsim-prod"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "12.0"
  administrator_login           = "sqladmin"
  administrator_login_password  = "ChangeMeInProd123!"
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

resource "azurerm_mssql_elasticpool" "pool" {
  name                = "ep-assetsim-prod"
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
    Environment = "Production"
  }
}

resource "azurerm_mssql_database" "db" {
  name            = "sqldb-assetsim"
  server_id       = azurerm_mssql_server.sql.id
  elastic_pool_id = azurerm_mssql_elasticpool.pool.id

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
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

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}
