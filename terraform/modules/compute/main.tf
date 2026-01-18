# 1. Premium Plan for Function App
resource "azurerm_service_plan" "plan" {
  name                = "asp-assetsim-prod"
  resource_group_name = var.resource_group_name
  location            = var.location
  os_type             = "Linux"
  sku_name            = "EP1" # Elastic Premium

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

# 2. Storage Account for Function App (Required)
resource "azurerm_storage_account" "func_storage" {
  name                     = "stfuncassetsimprod"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"
  public_network_access_enabled = false

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

# 2b. Private Endpoint for Storage Account
resource "azurerm_private_endpoint" "storage_pe" {
  name                = "pe-func-storage"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_endpoints_id

  private_service_connection {
    name                           = "psc-func-storage"
    private_connection_resource_id = azurerm_storage_account.func_storage.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "storage-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_blob_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

# 3. Dedicated Function App (Backend API & Engine)
resource "azurerm_linux_function_app" "backend" {
  name                = "func-assetsim-backend-prod"
  resource_group_name = var.resource_group_name
  location            = var.location
  service_plan_id     = azurerm_service_plan.plan.id
  storage_account_name       = azurerm_storage_account.func_storage.name
  storage_account_access_key = azurerm_storage_account.func_storage.primary_access_key

  site_config {
    vnet_route_all_enabled = true
    application_stack {
      node_version = "20"
    }
  }

  app_settings = {
    "WEBSITE_VNET_ROUTE_ALL" = "1"
    # Key Vault references for SQL/Redis/SignalR strings go here
    # Example: "SQL_CONNECTION_STRING" = "@Microsoft.KeyVault(SecretUri=${keyvault_uri}secrets/sql-connection-string/)"
  }

  identity {
    type = "SystemAssigned"
  }

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

# 4. VNet Integration Link
resource "azurerm_app_service_virtual_network_swift_connection" "vnet_integration" {
  app_service_id = azurerm_linux_function_app.backend.id
  subnet_id      = var.subnet_integration_id
}

# 5. Static Web App (Frontend)
resource "azurerm_static_web_app" "frontend" {
  name                = "stapp-assetsim-prod"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku_tier            = "Standard"
  sku_size            = "Standard"

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

# 6. BYOB Linking (SWA -> Function App)
resource "azurerm_static_web_app_function_app_registration" "link" {
  static_web_app_id         = azurerm_static_web_app.frontend.id
  function_app_resource_id  = azurerm_linux_function_app.backend.id
}
