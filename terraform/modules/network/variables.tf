variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "vnet_cidr" {
  description = "CIDR block for VNet"
  type        = string
}

variable "subnet_integration_cidr" {
  description = "CIDR block for integration subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "subnet_endpoints_cidr" {
  description = "CIDR block for endpoints subnet"
  type        = string
  default     = "10.0.2.0/24"
}
