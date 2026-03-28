output "stream_pool_id" {
  description = "OCID of the stream pool"
  value       = oci_streaming_stream_pool.main.id
}

output "kafka_bootstrap_servers" {
  description = "Kafka-compatible bootstrap servers endpoint"
  value       = oci_streaming_stream_pool.main.kafka_settings[0].bootstrap_servers
}

output "order_placed_stream_id" {
  description = "OCID of the order.placed stream"
  value       = oci_streaming_stream.order_placed.id
}

output "order_status_changed_stream_id" {
  description = "OCID of the order.status-changed stream"
  value       = oci_streaming_stream.order_status_changed.id
}

output "dispatch_courier_requests_stream_id" {
  description = "OCID of the dispatch.courier-requests stream"
  value       = oci_streaming_stream.dispatch_courier_requests.id
}

output "dispatch_courier_assigned_stream_id" {
  description = "OCID of the dispatch.courier-assigned stream"
  value       = oci_streaming_stream.dispatch_courier_assigned.id
}

output "dispatch_location_updated_stream_id" {
  description = "OCID of the dispatch.location-updated stream"
  value       = oci_streaming_stream.dispatch_location_updated.id
}

output "notification_send_stream_id" {
  description = "OCID of the notification.send stream"
  value       = oci_streaming_stream.notification_send.id
}
