output "mysql_primary_id" {
  description = "OCID of the MySQL primary DB system"
  value       = oci_mysql_mysql_db_system.primary.id
}

output "mysql_primary_endpoint" {
  description = "MySQL primary endpoint (host:port)"
  value       = "${oci_mysql_mysql_db_system.primary.ip_address}:${oci_mysql_mysql_db_system.primary.port}"
}

output "mysql_primary_ip" {
  description = "MySQL primary IP address"
  value       = oci_mysql_mysql_db_system.primary.ip_address
}

output "mysql_primary_port" {
  description = "MySQL primary port"
  value       = oci_mysql_mysql_db_system.primary.port
}

output "mysql_replica_id" {
  description = "OCID of the MySQL read replica"
  value       = oci_mysql_replica.read.id
}

output "mysql_replica_ip" {
  description = "MySQL replica IP address"
  value       = oci_mysql_replica.read.ip_address
}
