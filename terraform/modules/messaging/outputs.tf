output "eventhub_namespace_id" {
  description = "ID of the Event Hub namespace"
  value       = azurerm_eventhub_namespace.eh_ns.id
}

output "eventhub_namespace_name" {
  description = "Name of the Event Hub namespace"
  value       = azurerm_eventhub_namespace.eh_ns.name
}

output "eventhub_id" {
  description = "ID of the market ticks Event Hub"
  value       = azurerm_eventhub.ticks.id
}

output "eventhub_name" {
  description = "Name of the market ticks Event Hub"
  value       = azurerm_eventhub.ticks.name
}

output "keyvault_id" {
  description = "ID of the Key Vault"
  value       = azurerm_key_vault.kv.id
}

output "keyvault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.kv.name
}

output "keyvault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.kv.vault_uri
}

output "storage_account_id" {
  description = "ID of the cold storage account for archived market data"
  value       = azurerm_storage_account.cold_storage.id
}

output "storage_account_name" {
  description = "Name of the cold storage account"
  value       = azurerm_storage_account.cold_storage.name
}

output "market_data_archive_container_name" {
  description = "Name of the market data archive container"
  value       = azurerm_storage_container.market_data_archive.name
}

output "signalr_id" {
  description = "ID of the SignalR Service"
  value       = azurerm_signalr_service.sig.id
}

output "signalr_name" {
  description = "Name of the SignalR Service"
  value       = azurerm_signalr_service.sig.name
}

output "signalr_hostname" {
  description = "Hostname of the SignalR Service"
  value       = azurerm_signalr_service.sig.hostname
}

output "signalr_primary_connection_string" {
  description = "Primary connection string of the SignalR Service"
  value       = azurerm_signalr_service.sig.primary_connection_string
  sensitive   = true
}
