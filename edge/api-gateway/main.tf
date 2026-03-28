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
  prefix     = "${var.project}-${var.environment}"
  cors       = jsondecode(file("${path.module}/policies/cors.json"))
  rate_limit = jsondecode(file("${path.module}/policies/rate-limiting.json"))
}

# --- OCI API Gateway ---

resource "oci_apigateway_gateway" "main" {
  compartment_id             = var.compartment_id
  endpoint_type              = "PUBLIC"
  subnet_id                  = var.subnet_id
  display_name               = "${local.prefix}-apigw-main"
  network_security_group_ids = var.nsg_ids
}

# --- API Deployment: v1 ---

resource "oci_apigateway_deployment" "v1" {
  compartment_id = var.compartment_id
  gateway_id     = oci_apigateway_gateway.main.id
  path_prefix    = "/api/v1"
  display_name   = "${local.prefix}-apigw-deploy-v1"

  specification {

    # ── Deployment-level request policies ────────────────────────────

    request_policies {

      # JWT authentication — validated when present; per-route authorization
      # controls which routes require a token.
      authentication {
        type                        = "JWT_AUTHENTICATION"
        token_header                = "Authorization"
        token_auth_scheme           = "Bearer"
        is_anonymous_access_allowed = true
        issuers                     = [var.idcs_url]
        audiences                   = [var.idcs_client_id]

        verify_claims {
          key         = "iss"
          values      = [var.idcs_url]
          is_required = true
        }

        public_keys {
          type                        = "REMOTE_JWKS"
          uri                         = "${var.idcs_url}/admin/v1/SigningCert/jwk"
          max_cache_duration_in_hours = 1
          is_ssl_verify_disabled      = false
        }
      }

      # CORS
      cors {
        allowed_origins              = local.cors.allowed_origins
        allowed_methods              = local.cors.allowed_methods
        allowed_headers              = local.cors.allowed_headers
        exposed_headers              = local.cors.exposed_headers
        is_allow_credentials_allowed = local.cors.is_allow_credentials_allowed
        max_age_in_seconds           = local.cors.max_age_in_seconds
      }

      # Default rate limit
      rate_limiting {
        rate_in_requests_per_second = local.rate_limit.default.rate_in_requests_per_second
        rate_key                    = local.rate_limit.default.rate_key
      }
    }

    # ── Routes ───────────────────────────────────────────────────────

    # === Auth (public — no JWT required) ===

    routes {
      path    = "/auth/{pathSuffix*}"
      methods = ["POST", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.user_service_url}/auth/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANONYMOUS"
        }
      }
    }

    # === User Service (authenticated) ===

    routes {
      path    = "/users/{pathSuffix*}"
      methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.user_service_url}/users/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Order Service (authenticated) ===

    routes {
      path    = "/orders/{pathSuffix*}"
      methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.order_service_url}/orders/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Catalogue Service — browse (public GET) ===

    routes {
      path    = "/catalogues/{pathSuffix*}"
      methods = ["GET", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.catalogue_service_url}/catalogues/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANONYMOUS"
        }
      }
    }

    # === Catalogue Service — mutations (authenticated) ===

    routes {
      path    = "/catalogues/{pathSuffix*}"
      methods = ["POST", "PUT", "PATCH", "DELETE"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.catalogue_service_url}/catalogues/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Menu Service — browse (public GET) ===

    routes {
      path    = "/menus/{pathSuffix*}"
      methods = ["GET", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.catalogue_service_url}/menus/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANONYMOUS"
        }
      }
    }

    # === Menu Service — mutations (authenticated) ===

    routes {
      path    = "/menus/{pathSuffix*}"
      methods = ["POST", "PUT", "PATCH", "DELETE"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.catalogue_service_url}/menus/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Dispatch Service (authenticated) ===

    routes {
      path    = "/dispatch/{pathSuffix*}"
      methods = ["GET", "POST", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.dispatch_service_url}/dispatch/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Location Service (authenticated) ===

    routes {
      path    = "/locations/{pathSuffix*}"
      methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.location_service_url}/locations/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    routes {
      path    = "/geofences/{pathSuffix*}"
      methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.location_service_url}/geofences/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Notification Service (authenticated) ===

    routes {
      path    = "/notifications/{pathSuffix*}"
      methods = ["GET", "POST", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.notification_service_url}/notifications/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }

    # === Payment Service (authenticated) ===

    routes {
      path    = "/payments/{pathSuffix*}"
      methods = ["GET", "POST", "OPTIONS"]

      backend {
        type = "HTTP_BACKEND"
        url  = "${var.payment_service_url}/payments/$${request.path[pathSuffix]}"
      }

      request_policies {
        authorization {
          type = "ANY"
        }
      }
    }
  }
}
