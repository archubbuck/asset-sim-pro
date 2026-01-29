# Azure Container Apps Module for AssetSim Pro
# Provisions ACR, Container Apps Environment, and Container Apps

# Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = "acr${var.app_name}${var.environment}${var.location_short}"
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = "Premium" # Required for VNet integration
  admin_enabled       = false     # Use Managed Identity instead

  # Private endpoint for secure access
  public_network_access_enabled = false

  # Retention policy for untagged manifests
  retention_policy {
    enabled = true
    days    = 30
  }

  # Content trust (image signing)
  trust_policy {
    enabled = true
  }

  tags = var.tags
}

# Private Endpoint for ACR
resource "azurerm_private_endpoint" "acr_pe" {
  name                = "pe-acr-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_endpoints_id

  private_service_connection {
    name                           = "psc-acr"
    private_connection_resource_id = azurerm_container_registry.acr.id
    subresource_names              = ["registry"]
    is_manual_connection           = false
  }

  private_dns_zone_group {
    name                 = "dns-acr"
    private_dns_zone_ids = [var.private_dns_zone_acr_id]
  }

  tags = var.tags
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "logs" {
  name                = "log-${var.app_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Container Apps Environment
resource "azurerm_container_app_environment" "env" {
  name                       = "cae-${var.app_name}-${var.environment}"
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.logs.id

  # VNet integration
  infrastructure_subnet_id       = var.subnet_container_apps_id
  internal_load_balancer_enabled = true

  tags = var.tags
}

# Backend Container App (Azure Functions)
resource "azurerm_container_app" "backend" {
  name                         = "ca-${var.app_name}-backend-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  # Identity for accessing ACR and Key Vault
  identity {
    type = "SystemAssigned"
  }

  # Registry configuration
  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = "system"
  }

  # Secrets from Key Vault
  secret {
    name  = "sql-connection-string"
    value = var.sql_connection_string
  }

  secret {
    name  = "redis-connection-string"
    value = var.redis_connection_string
  }

  secret {
    name  = "signalr-connection-string"
    value = var.signalr_connection_string
  }

  secret {
    name  = "eventhub-connection-string"
    value = var.eventhub_connection_string
  }

  template {
    min_replicas = 1 # Required for Timer triggers
    max_replicas = 5

    container {
      name   = "backend"
      image  = "${azurerm_container_registry.acr.login_server}/backend:latest"
      cpu    = 1.0
      memory = "2Gi"

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "FUNCTIONS_WORKER_RUNTIME"
        value = "node"
      }

      env {
        name  = "AzureWebJobsScriptRoot"
        value = "/home/site/wwwroot"
      }

      env {
        name        = "SQL_CONNECTION_STRING"
        secret_name = "sql-connection-string"
      }

      env {
        name        = "REDIS_CONNECTION_STRING"
        secret_name = "redis-connection-string"
      }

      env {
        name        = "SIGNALR_CONNECTION_STRING"
        secret_name = "signalr-connection-string"
      }

      env {
        name        = "EVENT_HUB_CONNECTION_STRING"
        secret_name = "eventhub-connection-string"
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        port      = 7071
        path      = "/api/health"

        initial_delay = 60
        interval      = 30
        timeout       = 10
        failure_threshold = 3
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        port      = 7071
        path      = "/api/health"

        interval  = 10
        timeout   = 5
        failure_threshold = 3
        success_threshold = 1
      }
    }
  }

  # Internal ingress (VNet-only)
  ingress {
    external_enabled = false
    target_port      = 7071
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}

# Client Container App (Angular + nginx)
resource "azurerm_container_app" "client" {
  name                         = "ca-${var.app_name}-client-${var.environment}"
  container_app_environment_id = azurerm_container_app_environment.env.id
  resource_group_name          = var.resource_group_name
  revision_mode                = "Single"

  # Identity for accessing ACR
  identity {
    type = "SystemAssigned"
  }

  # Registry configuration
  registry {
    server   = azurerm_container_registry.acr.login_server
    identity = "system"
  }

  template {
    min_replicas = 0 # Scale to zero when idle
    max_replicas = 10

    container {
      name   = "client"
      image  = "${azurerm_container_registry.acr.login_server}/client:latest"
      cpu    = 0.5
      memory = "1Gi"

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # Liveness probe
      liveness_probe {
        transport = "HTTP"
        port      = 80
        path      = "/health"

        initial_delay = 5
        interval      = 30
        timeout       = 10
        failure_threshold = 3
      }

      # Readiness probe
      readiness_probe {
        transport = "HTTP"
        port      = 80
        path      = "/health"

        interval  = 10
        timeout   = 5
        failure_threshold = 3
        success_threshold = 1
      }
    }
  }

  # External ingress (HTTPS)
  ingress {
    external_enabled = true
    target_port      = 80
    transport        = "http"

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  tags = var.tags
}

# Grant ACR pull role to backend Container App
resource "azurerm_role_assignment" "backend_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.backend.identity[0].principal_id
}

# Grant ACR pull role to client Container App
resource "azurerm_role_assignment" "client_acr_pull" {
  scope                = azurerm_container_registry.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_container_app.client.identity[0].principal_id
}
