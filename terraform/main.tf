terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  backend "azurerm" {
    # Populated via pipeline variables
  }
}

provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

locals {
  region_suffix = lower(replace(var.location, " ", ""))
}

resource "azurerm_resource_group" "rg" {
  name     = "rg-assetsim-${var.environment}-${local.region_suffix}"
  location = var.location
}

module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  vnet_cidr           = var.vnet_cidr
  environment         = var.environment
}

module "data" {
  source                   = "./modules/data"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  subnet_id                = module.network.subnet_endpoints_id
  vnet_id                  = module.network.vnet_id
  sql_admin_password       = var.sql_admin_password
  private_dns_zone_sql_id  = module.network.private_dns_zone_sql_id
  environment              = var.environment
}

module "cache" {
  source                      = "./modules/cache"
  resource_group_name         = azurerm_resource_group.rg.name
  location                    = azurerm_resource_group.rg.location
  subnet_id                   = module.network.subnet_endpoints_id
  vnet_id                     = module.network.vnet_id
  private_dns_zone_redis_id   = module.network.private_dns_zone_redis_id
  environment                 = var.environment
}

module "messaging" {
  source                        = "./modules/messaging"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  subnet_id                     = module.network.subnet_endpoints_id
  vnet_id                       = module.network.vnet_id
  private_dns_zone_eventhub_id  = module.network.private_dns_zone_eventhub_id
  private_dns_zone_keyvault_id  = module.network.private_dns_zone_keyvault_id
  private_dns_zone_blob_id      = module.network.private_dns_zone_blob_id
  environment                   = var.environment
}

module "compute" {
  source                   = "./modules/compute"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  subnet_integration_id    = module.network.subnet_integration_id
  subnet_endpoints_id      = module.network.subnet_endpoints_id
  private_dns_zone_blob_id = module.network.private_dns_zone_blob_id
  environment              = var.environment
  static_web_app_location  = var.static_web_app_location
}
