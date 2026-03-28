variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "foodrush"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "certificate_authority_id" {
  description = "OCID of the OCI Certificate Authority for mTLS"
  type        = string
}

variable "services" {
  description = "Map of service names to their listening ports"
  type        = map(number)
  default = {
    user-service         = 3000
    order-service        = 3001
    catalogue-service    = 3002
    dispatch-service     = 3003
    location-service     = 3004
    notification-service = 3005
    payment-service      = 3006
  }
}

variable "namespace" {
  description = "Kubernetes namespace where services are deployed"
  type        = string
  default     = "foodrush"
}

variable "ingress_gateway_hosts" {
  description = "Hostnames the ingress gateway listens on"
  type        = list(string)
  default     = ["api.foodrush.io"]
}
