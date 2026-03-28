output "cluster_id" {
  description = "OCID of the OKE cluster"
  value       = oci_containerengine_cluster.main.id
}

output "cluster_endpoint" {
  description = "Kubernetes API endpoint"
  value       = oci_containerengine_cluster.main.endpoints[0].kubernetes
}

output "node_pool_ad1_id" {
  description = "OCID of the AD-1 node pool"
  value       = oci_containerengine_node_pool.ad1.id
}

output "node_pool_ad2_id" {
  description = "OCID of the AD-2 node pool"
  value       = oci_containerengine_node_pool.ad2.id
}
