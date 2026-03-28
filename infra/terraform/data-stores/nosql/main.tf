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

# --- Catalogue Table ---
resource "oci_nosql_table" "catalogue" {
  compartment_id = var.compartment_id
  name           = "${local.prefix}_catalogue"
  ddl_statement  = <<-EOT
    CREATE TABLE IF NOT EXISTS ${var.project}_${var.environment}_catalogue (
      id STRING,
      restaurant_id STRING,
      name STRING,
      description STRING,
      category STRING,
      image_url STRING,
      is_active BOOLEAN,
      created_at TIMESTAMP(3),
      updated_at TIMESTAMP(3),
      PRIMARY KEY (id)
    )
  EOT

  table_limits {
    max_read_units     = var.table_max_read_units
    max_write_units    = var.table_max_write_units
    max_storage_in_gbs = var.table_max_storage_gb
  }

  is_auto_reclaimable = false
}

# --- Menus Table ---
resource "oci_nosql_table" "menus" {
  compartment_id = var.compartment_id
  name           = "${local.prefix}_menus"
  ddl_statement  = <<-EOT
    CREATE TABLE IF NOT EXISTS ${var.project}_${var.environment}_menus (
      id STRING,
      catalogue_id STRING,
      restaurant_id STRING,
      name STRING,
      description STRING,
      price INTEGER,
      currency STRING,
      category STRING,
      dietary_tags ARRAY(STRING),
      is_available BOOLEAN,
      preparation_time_minutes INTEGER,
      image_url STRING,
      created_at TIMESTAMP(3),
      updated_at TIMESTAMP(3),
      PRIMARY KEY (id)
    )
  EOT

  table_limits {
    max_read_units     = var.table_max_read_units
    max_write_units    = var.table_max_write_units
    max_storage_in_gbs = var.table_max_storage_gb
  }

  is_auto_reclaimable = false
}

# --- Menu Item Index ---
resource "oci_nosql_index" "menus_by_restaurant" {
  table_name_or_id = oci_nosql_table.menus.id
  name             = "idx_menus_restaurant_id"

  keys {
    column_name = "restaurant_id"
  }
}

resource "oci_nosql_index" "menus_by_catalogue" {
  table_name_or_id = oci_nosql_table.menus.id
  name             = "idx_menus_catalogue_id"

  keys {
    column_name = "catalogue_id"
  }
}

resource "oci_nosql_index" "catalogue_by_restaurant" {
  table_name_or_id = oci_nosql_table.catalogue.id
  name             = "idx_catalogue_restaurant_id"

  keys {
    column_name = "restaurant_id"
  }
}
