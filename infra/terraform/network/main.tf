terraform {
  required_version = ">= 1.9.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

locals {
  prefix = "${var.project}-${var.environment}"
}

# --- VCN ---
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-vcn-main"
  cidr_blocks    = [var.vcn_cidr_block]
  dns_label      = "${var.project}vcn"
}

# --- Internet Gateway ---
resource "oci_core_internet_gateway" "igw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-igw-main"
  enabled        = true
}

# --- NAT Gateway (for private subnets outbound) ---
resource "oci_core_nat_gateway" "nat" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-nat-main"
}

# --- Service Gateway (for OCI services access from private subnets) ---
data "oci_core_services" "all" {}

resource "oci_core_service_gateway" "sgw" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-sgw-main"

  services {
    service_id = data.oci_core_services.all.services[0].id
  }
}

# --- Route Tables ---
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-rt-public"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.igw.id
    destination_type  = "CIDR_BLOCK"
  }
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-rt-private"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_nat_gateway.nat.id
    destination_type  = "CIDR_BLOCK"
  }

  route_rules {
    destination       = data.oci_core_services.all.services[0].cidr_block
    network_entity_id = oci_core_service_gateway.sgw.id
    destination_type  = "SERVICE_CIDR_BLOCK"
  }
}

# --- Network Security Groups ---

# Public NSG — allows HTTPS ingress, all egress
resource "oci_core_network_security_group" "public" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-nsg-public"
}

resource "oci_core_network_security_group_security_rule" "public_ingress_https" {
  network_security_group_id = oci_core_network_security_group.public.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = "0.0.0.0/0"
  source_type               = "CIDR_BLOCK"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 443
      max = 443
    }
  }
}

resource "oci_core_network_security_group_security_rule" "public_egress_all" {
  network_security_group_id = oci_core_network_security_group.public.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
}

# App NSG — allows traffic from public NSG, inter-service, all egress
resource "oci_core_network_security_group" "app" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-nsg-app"
}

resource "oci_core_network_security_group_security_rule" "app_ingress_from_public" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = oci_core_network_security_group.public.id
  source_type               = "NETWORK_SECURITY_GROUP"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 3000
      max = 3100
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_ingress_inter_service" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = oci_core_network_security_group.app.id
  source_type               = "NETWORK_SECURITY_GROUP"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 3000
      max = 3100
    }
  }
}

resource "oci_core_network_security_group_security_rule" "app_egress_all" {
  network_security_group_id = oci_core_network_security_group.app.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
}

# Data NSG — allows traffic from app NSG only
resource "oci_core_network_security_group" "data" {
  compartment_id = var.compartment_id
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${local.prefix}-nsg-data"
}

resource "oci_core_network_security_group_security_rule" "data_ingress_mysql" {
  network_security_group_id = oci_core_network_security_group.data.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = oci_core_network_security_group.app.id
  source_type               = "NETWORK_SECURITY_GROUP"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 3306
      max = 3306
    }
  }
}

resource "oci_core_network_security_group_security_rule" "data_ingress_redis" {
  network_security_group_id = oci_core_network_security_group.data.id
  direction                 = "INGRESS"
  protocol                  = "6" # TCP
  source                    = oci_core_network_security_group.app.id
  source_type               = "NETWORK_SECURITY_GROUP"
  stateless                 = false

  tcp_options {
    destination_port_range {
      min = 6379
      max = 6379
    }
  }
}

resource "oci_core_network_security_group_security_rule" "data_egress_all" {
  network_security_group_id = oci_core_network_security_group.data.id
  direction                 = "EGRESS"
  protocol                  = "all"
  destination               = "0.0.0.0/0"
  destination_type          = "CIDR_BLOCK"
  stateless                 = false
}

# --- Subnets ---

# Public subnet (LB, API Gateway)
resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${local.prefix}-subnet-public"
  cidr_block                 = var.public_subnet_cidr
  route_table_id             = oci_core_route_table.public.id
  dns_label                  = "pub"
  prohibit_public_ip_on_vnic = false
}

# Private app subnet (OKE nodes)
resource "oci_core_subnet" "app" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${local.prefix}-subnet-app"
  cidr_block                 = var.private_subnet_app_cidr
  route_table_id             = oci_core_route_table.private.id
  dns_label                  = "app"
  prohibit_public_ip_on_vnic = true
}

# Private data subnet (MySQL, Redis, NoSQL)
resource "oci_core_subnet" "data" {
  compartment_id             = var.compartment_id
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${local.prefix}-subnet-data"
  cidr_block                 = var.private_subnet_data_cidr
  route_table_id             = oci_core_route_table.private.id
  dns_label                  = "data"
  prohibit_public_ip_on_vnic = true
}
