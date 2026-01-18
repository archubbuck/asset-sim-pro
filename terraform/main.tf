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

resource "azurerm_resource_group" "rg" {
  name     = "rg-assetsim-prod-useast2"
  location = var.location
}

module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  vnet_cidr           = var.vnet_cidr
}

module "data" {
  source                   = "./modules/data"
  resource_group_name      = azurerm_resource_group.rg.name
  location                 = azurerm_resource_group.rg.location
  subnet_id                = module.network.subnet_endpoints_id
  vnet_id                  = module.network.vnet_id
  sql_admin_password       = var.sql_admin_password
  private_dns_zone_sql_id  = module.network.private_dns_zone_sql_id
}

module "cache" {
  source                      = "./modules/cache"
  resource_group_name         = azurerm_resource_group.rg.name
  location                    = azurerm_resource_group.rg.location
  subnet_id                   = module.network.subnet_endpoints_id
  vnet_id                     = module.network.vnet_id
  private_dns_zone_redis_id   = module.network.private_dns_zone_redis_id
}

module "messaging" {
  source                        = "./modules/messaging"
  resource_group_name           = azurerm_resource_group.rg.name
  location                      = azurerm_resource_group.rg.location
  subnet_id                     = module.network.subnet_endpoints_id
  vnet_id                       = module.network.vnet_id
  private_dns_zone_eventhub_id  = module.network.private_dns_zone_eventhub_id
  private_dns_zone_keyvault_id  = module.network.private_dns_zone_keyvault_id
}

module "compute" {
  source                  = "./modules/compute"
  resource_group_name     = azurerm_resource_group.rg.name
  location                = azurerm_resource_group.rg.location
  subnet_integration_id   = module.network.subnet_integration_id
  subnet_endpoints_id     = module.network.subnet_endpoints_id
  private_dns_zone_blob_id = module.network.private_dns_zone_blob_id
}
