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
  services = [
    "user-service",
    "catalogue-service",
    "order-service",
    "payment-service",
    "notification-service",
    "dispatch-service",
    "location-service",
  ]
}

resource "oci_artifacts_container_repository" "services" {
  for_each       = toset(local.services)
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}/${each.value}"
  is_immutable   = var.is_immutable
  is_public      = false
}
