output "apm_domain_id" {
  description = "OCID of the APM domain"
  value       = oci_apm_apm_domain.main.id
}

output "apm_data_upload_endpoint" {
  description = "APM data upload endpoint for trace ingestion"
  value       = oci_apm_apm_domain.main.data_upload_endpoint
}

output "log_group_platform_id" {
  description = "OCID of the platform log group"
  value       = oci_logging_log_group.platform.id
}

output "log_group_ids" {
  description = "Map of service name to log group OCID"
  value       = { for k, lg in oci_logging_log_group.services : k => lg.id }
}

output "alarm_ids" {
  description = "Map of alarm names to OCIDs"
  value = {
    p95_latency  = oci_monitoring_alarm.p95_latency.id
    error_rate   = oci_monitoring_alarm.error_rate.id
    pod_restarts = oci_monitoring_alarm.pod_restarts.id
    node_cpu     = oci_monitoring_alarm.node_cpu.id
    node_memory  = oci_monitoring_alarm.node_memory.id
  }
}
