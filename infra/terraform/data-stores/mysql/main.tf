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

# --- MySQL HeatWave Primary ---
resource "oci_mysql_mysql_db_system" "primary" {
  compartment_id      = var.compartment_id
  display_name        = "${local.prefix}-mysql-primary"
  shape_name          = var.mysql_shape
  subnet_id           = var.data_subnet_id
  availability_domain = var.availability_domain

  admin_username = var.mysql_admin_username
  admin_password = var.mysql_admin_password

  data_storage_size_in_gb = var.mysql_data_storage_gb

  backup_policy {
    is_enabled        = true
    retention_in_days = 7
    window_start_time = "03:00"
  }

  maintenance {
    window_start_time = "sun 04:00"
  }

  is_highly_available = true

  deletion_policy {
    automatic_backup_retention = "RETAIN"
    is_delete_protected        = true
  }
}

# --- MySQL Read Replica ---
resource "oci_mysql_replica" "read" {
  db_system_id = oci_mysql_mysql_db_system.primary.id
  display_name = "${local.prefix}-mysql-replica-01"
}
