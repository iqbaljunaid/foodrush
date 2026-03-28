output "repository_ids" {
  description = "Map of service name to OCIR repository OCID"
  value       = { for k, v in oci_artifacts_container_repository.services : k => v.id }
}
