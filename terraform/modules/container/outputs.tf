output "acr_id" {
  description = "Azure Container Registry ID"
  value       = azurerm_container_registry.acr.id
}

output "acr_login_server" {
  description = "Azure Container Registry login server"
  value       = azurerm_container_registry.acr.login_server
}

output "container_app_environment_id" {
  description = "Container Apps Environment ID"
  value       = azurerm_container_app_environment.env.id
}

output "backend_container_app_id" {
  description = "Backend Container App ID"
  value       = azurerm_container_app.backend.id
}

output "backend_fqdn" {
  description = "Backend Container App FQDN"
  value       = azurerm_container_app.backend.ingress[0].fqdn
}

output "client_container_app_id" {
  description = "Client Container App ID"
  value       = azurerm_container_app.client.id
}

output "client_fqdn" {
  description = "Client Container App FQDN"
  value       = azurerm_container_app.client.ingress[0].fqdn
}

output "log_analytics_workspace_id" {
  description = "Log Analytics Workspace ID"
  value       = azurerm_log_analytics_workspace.logs.id
}
