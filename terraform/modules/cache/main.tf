resource "azurerm_redis_cache" "redis" {
  name                          = "redis-assetsim-${var.environment}"
  location                      = var.location
  resource_group_name           = var.resource_group_name
  capacity                      = 1
  family                        = "C"
  sku_name                      = "Standard"
  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  public_network_access_enabled = false

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}

resource "azurerm_private_endpoint" "redis_pe" {
  name                = "pe-redis"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-redis"
    private_connection_resource_id = azurerm_redis_cache.redis.id
    subresource_names              = ["redisCache"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "redis-dns-zone-group"
    private_dns_zone_ids = [var.private_dns_zone_redis_id]
  }

  tags = {
    Service     = "AssetSim"
    Environment = var.environment
  }
}
