output "gateway_id" {
  description = "OCID of the OCI API Gateway"
  value       = oci_apigateway_gateway.main.id
}

output "gateway_hostname" {
  description = "Hostname of the API Gateway"
  value       = oci_apigateway_gateway.main.hostname
}

output "gateway_endpoint" {
  description = "Full base endpoint URL for the API Gateway"
  value       = "https://${oci_apigateway_gateway.main.hostname}"
}

output "deployment_id" {
  description = "OCID of the v1 API deployment"
  value       = oci_apigateway_deployment.v1.id
}

output "deployment_endpoint" {
  description = "Full endpoint URL for the v1 API deployment"
  value       = oci_apigateway_deployment.v1.endpoint
}
