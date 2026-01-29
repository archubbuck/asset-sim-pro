output "subnet_integration_id" {
  description = "ID of the integration subnet for VNet integration"
  value       = azurerm_subnet.integration.id
}

output "subnet_endpoints_id" {
  description = "ID of the endpoints subnet for private endpoints"
  value       = azurerm_subnet.endpoints.id
}

output "vnet_id" {
  description = "ID of the virtual network"
  value       = azurerm_virtual_network.vnet.id
}

output "private_dns_zone_sql_id" {
  description = "ID of the SQL private DNS zone"
  value       = azurerm_private_dns_zone.sql.id
}

output "private_dns_zone_redis_id" {
  description = "ID of the Redis private DNS zone"
  value       = azurerm_private_dns_zone.redis.id
}

output "private_dns_zone_eventhub_id" {
  description = "ID of the Event Hub private DNS zone"
  value       = azurerm_private_dns_zone.eventhub.id
}

output "private_dns_zone_keyvault_id" {
  description = "ID of the Key Vault private DNS zone"
  value       = azurerm_private_dns_zone.keyvault.id
}

output "private_dns_zone_blob_id" {
  description = "ID of the Blob Storage private DNS zone"
  value       = azurerm_private_dns_zone.blob.id
}

output "private_dns_zone_signalr_id" {
  description = "ID of the SignalR private DNS zone"
  value       = azurerm_private_dns_zone.signalr.id
}
