data "azurerm_client_config" "current" {}

resource "azurerm_eventhub_namespace" "eh_ns" {
  name                          = "ehns-assetsim-prod"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  sku                           = "Standard"
  capacity                      = 1
  public_network_access_enabled = false

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

resource "azurerm_eventhub" "ticks" {
  name                = "market-ticks"
  namespace_name      = azurerm_eventhub_namespace.eh_ns.name
  resource_group_name = var.resource_group_name
  partition_count     = 2
  message_retention   = 1
}

resource "azurerm_private_endpoint" "eventhub_pe" {
  name                = "pe-eventhub"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-eventhub"
    private_connection_resource_id = azurerm_eventhub_namespace.eh_ns.id
    subresource_names              = ["namespace"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "eventhub-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_eventhub_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

resource "azurerm_key_vault" "kv" {
  name                          = "kv-assetsim-prod"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  public_network_access_enabled = false
  purge_protection_enabled      = true
  soft_delete_retention_days    = 90

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}

resource "azurerm_private_endpoint" "keyvault_pe" {
  name                = "pe-keyvault"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-keyvault"
    private_connection_resource_id = azurerm_key_vault.kv.id
    subresource_names              = ["vault"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "keyvault-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_keyvault_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}
