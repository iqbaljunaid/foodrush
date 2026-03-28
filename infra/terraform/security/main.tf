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

# --- OCI Vault ---
resource "oci_kms_vault" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-vault-main"
  vault_type     = "DEFAULT"
}

# --- Master Encryption Key (for secrets) ---
resource "oci_kms_key" "master" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-key-master"
  management_endpoint = oci_kms_vault.main.management_endpoint

  key_shape {
    algorithm = "AES"
    length    = 32
  }

  protection_mode = "HSM"
}

# --- Service-specific key ring for DB credentials ---
resource "oci_kms_key" "db_credentials" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-key-db-credentials"
  management_endpoint = oci_kms_vault.main.management_endpoint

  key_shape {
    algorithm = "AES"
    length    = 32
  }

  protection_mode = "HSM"
}

# --- Key for API / JWT signing secrets ---
resource "oci_kms_key" "api_secrets" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-key-api-secrets"
  management_endpoint = oci_kms_vault.main.management_endpoint

  key_shape {
    algorithm = "AES"
    length    = 32
  }

  protection_mode = "HSM"
}

# --- Key for Stripe / payment secrets ---
resource "oci_kms_key" "payment_secrets" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-key-payment-secrets"
  management_endpoint = oci_kms_vault.main.management_endpoint

  key_shape {
    algorithm = "AES"
    length    = 32
  }

  protection_mode = "HSM"
}
