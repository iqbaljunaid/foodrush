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

# --- OCI Cache (Redis-compatible) ---
resource "oci_redis_redis_cluster" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-cache-cluster-01"
  subnet_id      = var.data_subnet_id
  node_count     = var.node_count
  node_memory_in_gbs = var.node_memory_gb
  software_version   = "REDIS_7_0"

  nsg_ids = [var.nsg_data_id]
}
