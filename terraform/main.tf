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
  location = "East US 2"
}

module "network" {
  source              = "./modules/network"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  vnet_cidr           = "10.0.0.0/16"
}

module "data" {
  source              = "./modules/data"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.subnet_endpoints_id
  vnet_id             = module.network.vnet_id
}

module "cache" {
  source              = "./modules/cache"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.subnet_endpoints_id
  vnet_id             = module.network.vnet_id
}

module "messaging" {
  source              = "./modules/messaging"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  subnet_id           = module.network.subnet_endpoints_id
  vnet_id             = module.network.vnet_id
}

module "compute" {
  source                = "./modules/compute"
  resource_group_name   = azurerm_resource_group.rg.name
  location              = azurerm_resource_group.rg.location
  subnet_integration_id = module.network.subnet_integration_id
}
