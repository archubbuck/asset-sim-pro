output "function_app_id" {
  description = "ID of the Function App"
  value       = azurerm_linux_function_app.backend.id
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.backend.name
}

output "function_app_principal_id" {
  description = "Principal ID of the Function App managed identity"
  value       = azurerm_linux_function_app.backend.identity[0].principal_id
}

output "static_web_app_id" {
  description = "ID of the Static Web App"
  value       = azurerm_static_web_app.frontend.id
}

output "static_web_app_name" {
  description = "Name of the Static Web App"
  value       = azurerm_static_web_app.frontend.name
}

output "static_web_app_default_hostname" {
  description = "Default hostname of the Static Web App"
  value       = azurerm_static_web_app.frontend.default_host_name
}
