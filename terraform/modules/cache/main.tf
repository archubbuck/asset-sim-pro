resource "azurerm_redis_cache" "redis" {
  name                          = "redis-assetsim-prod"
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
    Environment = "Production"
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

  tags = {
    Service     = "AssetSim"
    Environment = "Production"
  }
}
