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
