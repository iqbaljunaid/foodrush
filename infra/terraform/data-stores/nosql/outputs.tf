output "catalogue_table_id" {
  description = "OCID of the catalogue NoSQL table"
  value       = oci_nosql_table.catalogue.id
}

output "menus_table_id" {
  description = "OCID of the menus NoSQL table"
  value       = oci_nosql_table.menus.id
}

output "catalogue_table_name" {
  description = "Name of the catalogue NoSQL table"
  value       = oci_nosql_table.catalogue.name
}

output "menus_table_name" {
  description = "Name of the menus NoSQL table"
  value       = oci_nosql_table.menus.name
}
