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

# --- OCI APM Domain ---

resource "oci_apm_apm_domain" "main" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-apm-domain"
  is_free_tier   = false
  description    = "APM domain for FoodRush platform tracing and performance monitoring"
}

# --- Log Groups (one per service + platform) ---

resource "oci_logging_log_group" "platform" {
  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-loggroup-platform"
  description    = "Platform-level logs (infra, mesh, ingress)"
}

resource "oci_logging_log_group" "services" {
  for_each = toset(var.services)

  compartment_id = var.compartment_id
  display_name   = "${local.prefix}-loggroup-${each.key}"
  description    = "Application logs for ${each.key}"
}

# --- Custom Logs (per service) ---

resource "oci_logging_log" "service_app_logs" {
  for_each = toset(var.services)

  display_name = "${local.prefix}-log-${each.key}-app"
  log_group_id = oci_logging_log_group.services[each.key].id
  log_type     = "CUSTOM"
  is_enabled   = true

  retention_duration = 90
}

# --- OCI Monitoring Alarm: P95 Latency > threshold ---

resource "oci_monitoring_alarm" "p95_latency" {
  compartment_id        = var.compartment_id
  display_name          = "${local.prefix}-alarm-p95-latency"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "apm_domain"
  severity              = "CRITICAL"
  pending_duration      = "PT5M"
  body                  = "P95 latency has exceeded ${var.p95_latency_threshold_ms}ms for the FoodRush platform."
  message_format        = "ONS_OPTIMIZED"

  query = "HttpServerSpan[5m]{apmDomainId = \"${oci_apm_apm_domain.main.id}\"}.percentile(0.95) > ${var.p95_latency_threshold_ms}"

  destinations = [var.notification_topic_id]

  suppression {
    description         = "Maintenance window suppression"
    time_suppress_from  = "2026-01-01T00:00:00Z"
    time_suppress_until = "2026-01-01T00:00:00Z"
  }
}

# --- OCI Monitoring Alarm: Error Rate > threshold ---

resource "oci_monitoring_alarm" "error_rate" {
  compartment_id        = var.compartment_id
  display_name          = "${local.prefix}-alarm-error-rate"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "apm_domain"
  severity              = "CRITICAL"
  pending_duration      = "PT5M"
  body                  = "Error rate has exceeded ${var.error_rate_threshold_percent}% for the FoodRush platform."
  message_format        = "ONS_OPTIMIZED"

  query = "HttpServerSpan[5m]{apmDomainId = \"${oci_apm_apm_domain.main.id}\", hasError = \"true\"}.count() / HttpServerSpan[5m]{apmDomainId = \"${oci_apm_apm_domain.main.id}\"}.count() * 100 > ${var.error_rate_threshold_percent}"

  destinations = [var.notification_topic_id]
}

# --- OCI Monitoring Alarm: Pod Restart Count ---

resource "oci_monitoring_alarm" "pod_restarts" {
  compartment_id        = var.compartment_id
  display_name          = "${local.prefix}-alarm-pod-restarts"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "oci_oke"
  severity              = "WARNING"
  pending_duration      = "PT5M"
  body                  = "Pod restart count has exceeded ${var.pod_restart_threshold} in the FoodRush OKE cluster."
  message_format        = "ONS_OPTIMIZED"

  query = "PodRestartCount[5m]{resourceId = \"${var.oke_cluster_id}\"}.sum() > ${var.pod_restart_threshold}"

  destinations = [var.notification_topic_id]
}

# --- OCI Monitoring Alarm: High CPU on OKE nodes ---

resource "oci_monitoring_alarm" "node_cpu" {
  compartment_id        = var.compartment_id
  display_name          = "${local.prefix}-alarm-node-cpu"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "oci_oke"
  severity              = "WARNING"
  pending_duration      = "PT10M"
  body                  = "OKE node CPU utilization has exceeded 85% for 10 minutes."
  message_format        = "ONS_OPTIMIZED"

  query = "NodeCpuUtilization[5m]{resourceId = \"${var.oke_cluster_id}\"}.mean() > 85"

  destinations = [var.notification_topic_id]
}

# --- OCI Monitoring Alarm: High Memory on OKE nodes ---

resource "oci_monitoring_alarm" "node_memory" {
  compartment_id        = var.compartment_id
  display_name          = "${local.prefix}-alarm-node-memory"
  is_enabled            = true
  metric_compartment_id = var.compartment_id
  namespace             = "oci_oke"
  severity              = "WARNING"
  pending_duration      = "PT10M"
  body                  = "OKE node memory utilization has exceeded 85% for 10 minutes."
  message_format        = "ONS_OPTIMIZED"

  query = "NodeMemoryUtilization[5m]{resourceId = \"${var.oke_cluster_id}\"}.mean() > 85"

  destinations = [var.notification_topic_id]
}
