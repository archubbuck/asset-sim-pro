data "azurerm_client_config" "current" {}

# Messaging Module - ARCHITECTURE.md L527-L552
# Implements secure messaging infrastructure with:
# - Event Hub namespace and hub for market tick streaming
# - Event Hubs Capture for cold path data archival (ADR-010)
# - Storage Account for archived market data with lifecycle management
# - Key Vault for secrets management
# - SignalR Service for real-time client communication (Serverless mode with MessagePack)
# - Private endpoints for all services (Zero Trust network access)
# - Public network access disabled for security

resource "azurerm_eventhub_namespace" "eh_ns" {
  name                          = "ehns-assetsim-${var.environment}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  sku                           = "Standard"
  capacity                      = 1
  public_network_access_enabled = false

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

resource "azurerm_eventhub" "ticks" {
  name                = "market-ticks"
  namespace_name      = azurerm_eventhub_namespace.eh_ns.name
  resource_group_name = var.resource_group_name
  partition_count     = 2
  message_retention   = 1

  # ADR-010: Event Hubs Capture for cold path archive
  capture_description {
    enabled             = true
    encoding            = "Avro"
    interval_in_seconds = 300 # Capture every 5 minutes
    size_limit_in_bytes = 314572800 # 300 MB

    destination {
      name                = "EventHubArchive.AzureBlockBlob"
      archive_name_format = "{Namespace}/{EventHub}/{PartitionId}/{Year}/{Month}/{Day}/{Hour}/{Minute}/{Second}"
      blob_container_name = azurerm_storage_container.market_data_archive.name
      storage_account_id  = azurerm_storage_account.cold_storage.id
    }
  }
}

# ADR-010: Storage Account for Cold Path (archived market data)
resource "azurerm_storage_account" "cold_storage" {
  name                          = "stassetsim${var.environment}"
  resource_group_name           = var.resource_group_name
  location                      = var.location
  account_tier                  = "Standard"
  account_replication_type      = "LRS"
  public_network_access_enabled = false
  min_tls_version               = "TLS1_2"

  blob_properties {
    versioning_enabled = true

    # Lifecycle management for cold storage tiering
    delete_retention_policy {
      days = 90 # Keep deleted data for 90 days
    }
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

# Container for archived market data from Event Hubs Capture
resource "azurerm_storage_container" "market_data_archive" {
  name                  = "market-data-archive"
  storage_account_name  = azurerm_storage_account.cold_storage.name
  container_access_type = "private"
}

# Lifecycle management policy for storage tiering
resource "azurerm_storage_management_policy" "cold_path_lifecycle" {
  storage_account_id = azurerm_storage_account.cold_storage.id

  rule {
    name    = "archiveOldMarketData"
    enabled = true

    filters {
      prefix_match = ["market-data-archive/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than    = 30  # Move to Cool tier after 30 days
        tier_to_archive_after_days_since_modification_greater_than = 90  # Move to Archive tier after 90 days
      }
    }
  }
}

# Private endpoint for Blob Storage
resource "azurerm_private_endpoint" "storage_pe" {
  name                = "pe-storage-blob"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-storage-blob"
    private_connection_resource_id = azurerm_storage_account.cold_storage.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "storage-blob-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_blob_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
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
    Environment = var.environment
  }
}

resource "azurerm_key_vault" "kv" {
  name                          = "kv-assetsim-${var.environment}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  public_network_access_enabled = false
  purge_protection_enabled      = true
  soft_delete_retention_days    = 90

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
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
    Environment = var.environment
  }
}

# SignalR Service (ARCHITECTURE.md L544-L554)
resource "azurerm_signalr_service" "sig" {
  name                          = "sig-assetsim-${var.environment}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  
  sku {
    name     = "Standard_S1"
    capacity = 1
  }
  
  service_mode                  = "Serverless"
  public_network_access_enabled = false

  # MessagePack protocol requirement from ADR-009
  cors {
    allowed_origins = ["*"]
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

# Private endpoint for SignalR Service
resource "azurerm_private_endpoint" "signalr_pe" {
  name                = "pe-signalr"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-signalr"
    private_connection_resource_id = azurerm_signalr_service.sig.id
    subresource_names              = ["signalr"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "signalr-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_signalr_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}
