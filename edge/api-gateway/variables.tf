variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "subnet_id" {
  description = "OCID of the public subnet for the API Gateway"
  type        = string
}

variable "nsg_ids" {
  description = "List of NSG OCIDs to associate with the API Gateway"
  type        = list(string)
  default     = []
}

variable "project" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "foodrush"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# --- IDCS / JWT Configuration ---

variable "idcs_url" {
  description = "OCI IDCS instance base URL (e.g. https://idcs-<guid>.identity.oraclecloud.com)"
  type        = string
}

variable "idcs_client_id" {
  description = "IDCS application client ID used as the JWT audience"
  type        = string
  sensitive   = true
}

# --- Backend Service URLs ---

variable "user_service_url" {
  description = "Base URL of the user service"
  type        = string
  default     = "http://user-service.foodrush.svc.cluster.local:3000"
}

variable "order_service_url" {
  description = "Base URL of the order service"
  type        = string
  default     = "http://order-service.foodrush.svc.cluster.local:3001"
}

variable "catalogue_service_url" {
  description = "Base URL of the catalogue service"
  type        = string
  default     = "http://catalogue-service.foodrush.svc.cluster.local:3002"
}

variable "dispatch_service_url" {
  description = "Base URL of the dispatch service"
  type        = string
  default     = "http://dispatch-service.foodrush.svc.cluster.local:3003"
}

variable "location_service_url" {
  description = "Base URL of the location service"
  type        = string
  default     = "http://location-service.foodrush.svc.cluster.local:3004"
}

variable "notification_service_url" {
  description = "Base URL of the notification service"
  type        = string
  default     = "http://notification-service.foodrush.svc.cluster.local:3005"
}

variable "payment_service_url" {
  description = "Base URL of the payment service"
  type        = string
  default     = "http://payment-service.foodrush.svc.cluster.local:3006"
}
