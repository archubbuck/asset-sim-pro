variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for private endpoints"
  type        = string
}

variable "vnet_id" {
  description = "Virtual Network ID"
  type        = string
}

variable "private_dns_zone_eventhub_id" {
  description = "ID of the Event Hub private DNS zone"
  type        = string
}

variable "private_dns_zone_keyvault_id" {
  description = "ID of the Key Vault private DNS zone"
  type        = string
}

variable "private_dns_zone_blob_id" {
  description = "ID of the Blob Storage private DNS zone"
  type        = string
}

variable "private_dns_zone_signalr_id" {
  description = "ID of the SignalR private DNS zone"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging, dev)"
  type        = string
  default     = "prod"
}
