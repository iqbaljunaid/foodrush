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

# --- OCI WAF Policy ---

resource "oci_waf_web_app_firewall_policy" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-waf-policy"

  # ── OWASP Protection Rules ──────────────────────────────────────

  actions {
    name = "block"
    type = "RETURN_HTTP_RESPONSE"

    body {
      text = "{\"error\":\"Request blocked by WAF policy\"}"
      type = "STATIC_TEXT"
    }

    code = 403

    headers {
      name  = "Content-Type"
      value = "application/json"
    }
  }

  actions {
    name = "log_only"
    type = "CHECK"
  }

  actions {
    name = "rate_limit_block"
    type = "RETURN_HTTP_RESPONSE"

    body {
      text = "{\"error\":\"Rate limit exceeded. Try again later.\"}"
      type = "STATIC_TEXT"
    }

    code = 429

    headers {
      name  = "Content-Type"
      value = "application/json"
    }

    headers {
      name  = "Retry-After"
      value = tostring(var.ip_rate_limit_action_duration_in_seconds)
    }
  }

  # ── SQL Injection Protection ────────────────────────────────────

  request_protection {
    rules {
      name                = "sql-injection-protection"
      type                = "PROTECTION"
      action_name         = "block"
      condition           = ""
      condition_language  = "JMESPATH"
      is_body_inspection_enabled = true

      protection_capabilities {
        key     = "941110"
        version = 1

        exclusions {
          request_cookies = []
          args            = []
        }

        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "942100"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "942110"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "942120"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "942130"
        version = 1
        collaborative_action_threshold = 4
      }
    }

    # ── XSS Protection ─────────────────────────────────────────────

    rules {
      name                = "xss-protection"
      type                = "PROTECTION"
      action_name         = "block"
      condition           = ""
      condition_language  = "JMESPATH"
      is_body_inspection_enabled = true

      protection_capabilities {
        key     = "941100"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "941110"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "941120"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "941130"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "941140"
        version = 1
        collaborative_action_threshold = 4
      }
    }

    # ── Remote File Inclusion / Local File Inclusion ───────────────

    rules {
      name                = "rfi-lfi-protection"
      type                = "PROTECTION"
      action_name         = "block"
      condition           = ""
      condition_language  = "JMESPATH"
      is_body_inspection_enabled = true

      protection_capabilities {
        key     = "931100"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "931110"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "931120"
        version = 1
        collaborative_action_threshold = 4
      }
    }

    # ── Command Injection Protection ──────────────────────────────

    rules {
      name                = "command-injection-protection"
      type                = "PROTECTION"
      action_name         = "block"
      condition           = ""
      condition_language  = "JMESPATH"
      is_body_inspection_enabled = true

      protection_capabilities {
        key     = "932100"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "932105"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "932110"
        version = 1
        collaborative_action_threshold = 4
      }

      protection_capabilities {
        key     = "932115"
        version = 1
        collaborative_action_threshold = 4
      }
    }
  }

  # ── Rate Limiting / DDoS Protection ─────────────────────────────

  request_rate_limiting {
    rules {
      name        = "ip-rate-limit"
      type        = "RATE_LIMITING"
      action_name = "rate_limit_block"
      condition   = ""
      condition_language = "JMESPATH"

      configurations {
        period_in_seconds          = 1
        requests_limit             = var.rate_limit_requests_per_second
        action_duration_in_seconds = var.ip_rate_limit_action_duration_in_seconds
      }
    }

    rules {
      name        = "api-burst-protection"
      type        = "RATE_LIMITING"
      action_name = "rate_limit_block"
      condition   = "i_contains(httpRequest.url, '/api/')"
      condition_language = "JMESPATH"

      configurations {
        period_in_seconds          = 10
        requests_limit             = 500
        action_duration_in_seconds = 30
      }
    }
  }

  # ── HTTP Method Enforcement ─────────────────────────────────────

  request_access_control {
    default_action_name = "block"

    rules {
      name        = "allow-standard-methods"
      action_name = "log_only"
      type        = "ACCESS_CONTROL"
      condition   = "i_contains(['${join("','", var.allowed_http_methods)}'], httpRequest.method)"
      condition_language = "JMESPATH"
    }

    rules {
      name        = "block-scanners-user-agents"
      action_name = "block"
      type        = "ACCESS_CONTROL"
      condition   = "i_contains(httpRequest.headers['user-agent'], 'sqlmap') || i_contains(httpRequest.headers['user-agent'], 'nikto') || i_contains(httpRequest.headers['user-agent'], 'nmap') || i_contains(httpRequest.headers['user-agent'], 'masscan')"
      condition_language = "JMESPATH"
    }
  }

  # ── Response Protection (data leakage prevention) ───────────────

  response_protection {
    rules {
      name                = "credit-card-leakage"
      type                = "PROTECTION"
      action_name         = "block"
      condition           = ""
      condition_language  = "JMESPATH"
      is_body_inspection_enabled = true

      protection_capabilities {
        key     = "950001"
        version = 1
        collaborative_action_threshold = 4
      }
    }
  }
}

# --- Attach WAF to Load Balancer ---

resource "oci_waf_web_app_firewall" "main" {
  compartment_id                = var.compartment_id
  backend_type                  = "LOAD_BALANCER"
  load_balancer_id              = var.load_balancer_id
  web_app_firewall_policy_id    = oci_waf_web_app_firewall_policy.main.id
  display_name                  = "${local.prefix}-waf-main"
}
