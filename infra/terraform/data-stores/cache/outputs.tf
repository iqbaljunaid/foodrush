output "cache_cluster_id" {
  description = "OCID of the OCI Cache cluster"
  value       = oci_redis_redis_cluster.main.id
}

output "cache_primary_endpoint" {
  description = "Primary endpoint for the cache cluster"
  value       = oci_redis_redis_cluster.main.primary_endpoint_ip_address
}

output "cache_replicas_endpoint" {
  description = "Replicas endpoint for the cache cluster"
  value       = oci_redis_redis_cluster.main.replicas_endpoint_ip_address
}

output "cache_port" {
  description = "Port for the cache cluster"
  value       = 6379
}
