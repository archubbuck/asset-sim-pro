variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subnet_integration_id" {
  description = "Subnet ID for VNet integration"
  type        = string
}

variable "subnet_endpoints_id" {
  description = "Subnet ID for private endpoints"
  type        = string
}

variable "private_dns_zone_blob_id" {
  description = "ID of the Blob Storage private DNS zone"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "static_web_app_location" {
  description = "Location for Static Web App (must be a supported region)"
  type        = string
  default     = "Central US"
}
