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
