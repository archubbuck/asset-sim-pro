variable "app_name" {
  description = "Application name (e.g., 'assetsim')"
  type        = string
  default     = "assetsim"
}

variable "environment" {
  description = "Environment (e.g., 'prod', 'dev')"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "location_short" {
  description = "Short location code (e.g., 'useast2')"
  type        = string
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "subnet_endpoints_id" {
  description = "Subnet ID for private endpoints"
  type        = string
}

variable "subnet_container_apps_id" {
  description = "Subnet ID for Container Apps infrastructure"
  type        = string
}

variable "private_dns_zone_acr_id" {
  description = "Private DNS zone ID for Azure Container Registry"
  type        = string
}

variable "sql_connection_string" {
  description = "SQL Server connection string"
  type        = string
  sensitive   = true
}

variable "redis_connection_string" {
  description = "Redis connection string"
  type        = string
  sensitive   = true
}

variable "signalr_connection_string" {
  description = "SignalR connection string"
  type        = string
  sensitive   = true
}

variable "eventhub_connection_string" {
  description = "Event Hub connection string"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
