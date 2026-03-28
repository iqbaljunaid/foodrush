output "vault_id" {
  description = "OCID of the OCI Vault"
  value       = oci_kms_vault.main.id
}

output "vault_management_endpoint" {
  description = "Vault management endpoint"
  value       = oci_kms_vault.main.management_endpoint
}

output "vault_crypto_endpoint" {
  description = "Vault crypto endpoint"
  value       = oci_kms_vault.main.crypto_endpoint
}

output "master_key_id" {
  description = "OCID of the master encryption key"
  value       = oci_kms_key.master.id
}

output "db_credentials_key_id" {
  description = "OCID of the DB credentials key"
  value       = oci_kms_key.db_credentials.id
}

output "api_secrets_key_id" {
  description = "OCID of the API secrets key"
  value       = oci_kms_key.api_secrets.id
}

output "payment_secrets_key_id" {
  description = "OCID of the payment secrets key"
  value       = oci_kms_key.payment_secrets.id
}
