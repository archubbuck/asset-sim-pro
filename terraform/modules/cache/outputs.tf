output "redis_id" {
  description = "ID of the Redis cache"
  value       = azurerm_redis_cache.redis.id
}

output "redis_name" {
  description = "Name of the Redis cache"
  value       = azurerm_redis_cache.redis.name
}

output "redis_hostname" {
  description = "Hostname of the Redis cache"
  value       = azurerm_redis_cache.redis.hostname
}
