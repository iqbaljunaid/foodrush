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

# --- OCI Service Mesh ---

resource "oci_service_mesh_mesh" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-mesh-main"

  certificate_authorities {
    id = var.certificate_authority_id
  }

  mtls {
    minimum = "STRICT"
  }

  description = "FoodRush service mesh with strict mTLS"
}

# --- Virtual Services (one per microservice) ---

resource "oci_service_mesh_virtual_service" "services" {
  for_each = var.services

  compartment_id = var.compartment_id
  mesh_id        = oci_service_mesh_mesh.main.id
  name           = "${local.prefix}-vs-${each.key}"

  default_routing_policy {
    type = "UNIFORM"
  }

  hosts = ["${each.key}.${var.namespace}.svc.cluster.local"]

  mtls {
    mode              = "STRICT"
    certificate_id    = var.certificate_authority_id
    maximum_validity  = 45
  }

  description = "Virtual service for ${each.key}"
}

# --- Virtual Deployments (one per service) ---

resource "oci_service_mesh_virtual_deployment" "services" {
  for_each = var.services

  compartment_id = var.compartment_id
  virtual_service_id = oci_service_mesh_virtual_service.services[each.key].id
  name               = "${local.prefix}-vd-${each.key}"

  access_logging {
    is_enabled = true
  }

  listener {
    port     = each.value
    protocol = "HTTP"
  }

  service_discovery {
    type     = "DNS"
    hostname = "${each.key}.${var.namespace}.svc.cluster.local"
  }

  description = "Virtual deployment for ${each.key}"
}

# --- Virtual Service Route Tables ---

resource "oci_service_mesh_virtual_service_route_table" "services" {
  for_each = var.services

  compartment_id     = var.compartment_id
  virtual_service_id = oci_service_mesh_virtual_service.services[each.key].id
  name               = "${local.prefix}-vsrt-${each.key}"
  priority           = 1

  route_rules {
    type = "HTTP"

    destinations {
      virtual_deployment_id = oci_service_mesh_virtual_deployment.services[each.key].id
      port                  = each.value
      weight                = 100
    }

    is_grpc = false
    path    = "/"
    path_type = "PREFIX"
  }

  description = "Route table for ${each.key}"
}

# --- Ingress Gateway ---

resource "oci_service_mesh_ingress_gateway" "main" {
  compartment_id = var.compartment_id
  mesh_id        = oci_service_mesh_mesh.main.id
  name           = "${local.prefix}-igw-main"

  hosts {
    name = "foodrush-api"

    hostnames = var.ingress_gateway_hosts

    listeners {
      port     = 443
      protocol = "TLS_PASSTHROUGH"
      tls {
        mode               = "TLS"
        client_validation {
          subject_alternate_names = var.ingress_gateway_hosts
        }
      }
    }
  }

  access_logging {
    is_enabled = true
  }

  description = "Ingress gateway for external traffic into the mesh"
}

# --- Ingress Gateway Route Tables ---
# Route from ingress gateway to user-service and order-service (public-facing)

resource "oci_service_mesh_ingress_gateway_route_table" "main" {
  compartment_id    = var.compartment_id
  ingress_gateway_id = oci_service_mesh_ingress_gateway.main.id
  name               = "${local.prefix}-igw-rt-main"

  route_rules {
    type = "HTTP"

    destinations {
      virtual_service_id = oci_service_mesh_virtual_service.services["user-service"].id
      port               = var.services["user-service"]
      weight             = 100
    }

    is_grpc   = false
    path      = "/api/v1/users"
    path_type = "PREFIX"
  }

  route_rules {
    type = "HTTP"

    destinations {
      virtual_service_id = oci_service_mesh_virtual_service.services["order-service"].id
      port               = var.services["order-service"]
      weight             = 100
    }

    is_grpc   = false
    path      = "/api/v1/orders"
    path_type = "PREFIX"
  }

  route_rules {
    type = "HTTP"

    destinations {
      virtual_service_id = oci_service_mesh_virtual_service.services["catalogue-service"].id
      port               = var.services["catalogue-service"]
      weight             = 100
    }

    is_grpc   = false
    path      = "/api/v1/catalogue"
    path_type = "PREFIX"
  }

  route_rules {
    type = "HTTP"

    destinations {
      virtual_service_id = oci_service_mesh_virtual_service.services["dispatch-service"].id
      port               = var.services["dispatch-service"]
      weight             = 100
    }

    is_grpc   = false
    path      = "/api/v1/dispatch"
    path_type = "PREFIX"
  }

  route_rules {
    type = "HTTP"

    destinations {
      virtual_service_id = oci_service_mesh_virtual_service.services["payment-service"].id
      port               = var.services["payment-service"]
      weight             = 100
    }

    is_grpc   = false
    path      = "/api/v1/payments"
    path_type = "PREFIX"
  }

  description = "Ingress gateway route table for public-facing services"
}
