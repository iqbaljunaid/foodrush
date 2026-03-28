output "vcn_id" {
  description = "OCID of the VCN"
  value       = oci_core_vcn.main.id
}

output "public_subnet_id" {
  description = "OCID of the public subnet"
  value       = oci_core_subnet.public.id
}

output "app_subnet_id" {
  description = "OCID of the private application subnet"
  value       = oci_core_subnet.app.id
}

output "data_subnet_id" {
  description = "OCID of the private data subnet"
  value       = oci_core_subnet.data.id
}

output "nsg_public_id" {
  description = "OCID of the public NSG"
  value       = oci_core_network_security_group.public.id
}

output "nsg_app_id" {
  description = "OCID of the application NSG"
  value       = oci_core_network_security_group.app.id
}

output "nsg_data_id" {
  description = "OCID of the data NSG"
  value       = oci_core_network_security_group.data.id
}
