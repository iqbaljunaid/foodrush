output "mesh_id" {
  description = "OCID of the OCI Service Mesh"
  value       = oci_service_mesh_mesh.main.id
}

output "virtual_service_ids" {
  description = "Map of service name to VirtualService OCID"
  value       = { for k, vs in oci_service_mesh_virtual_service.services : k => vs.id }
}

output "virtual_deployment_ids" {
  description = "Map of service name to VirtualDeployment OCID"
  value       = { for k, vd in oci_service_mesh_virtual_deployment.services : k => vd.id }
}

output "ingress_gateway_id" {
  description = "OCID of the ingress gateway"
  value       = oci_service_mesh_ingress_gateway.main.id
}
