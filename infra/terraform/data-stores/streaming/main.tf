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

# --- Stream Pool ---
resource "oci_streaming_stream_pool" "main" {
  compartment_id = var.compartment_id
  name           = "${local.prefix}-stream-pool"

  kafka_settings {
    auto_create_topics_enable = false
    num_partitions            = var.partitions
    log_retention_hours       = var.retention_in_hours
  }
}

# --- Order domain streams ---
resource "oci_streaming_stream" "order_placed" {
  name              = "order.placed"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}

resource "oci_streaming_stream" "order_status_changed" {
  name              = "order.status-changed"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}

# --- Dispatch domain streams ---
resource "oci_streaming_stream" "dispatch_courier_requests" {
  name              = "dispatch.courier-requests"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}

resource "oci_streaming_stream" "dispatch_courier_assigned" {
  name              = "dispatch.courier-assigned"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}

resource "oci_streaming_stream" "dispatch_location_updated" {
  name              = "dispatch.location-updated"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}

# --- Notification domain streams ---
resource "oci_streaming_stream" "notification_send" {
  name              = "notification.send"
  partitions        = var.partitions
  stream_pool_id    = oci_streaming_stream_pool.main.id
  retention_in_hours = var.retention_in_hours
}
