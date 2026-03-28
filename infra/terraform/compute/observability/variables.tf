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

variable "p95_latency_threshold_ms" {
  description = "P95 latency threshold in milliseconds for alerting"
  type        = number
  default     = 500
}

variable "error_rate_threshold_percent" {
  description = "Error rate percentage threshold for alerting"
  type        = number
  default     = 5
}

variable "pod_restart_threshold" {
  description = "Pod restart count threshold for alerting"
  type        = number
  default     = 3
}

variable "notification_topic_id" {
  description = "OCID of the OCI Notification topic for alert delivery"
  type        = string
}

variable "oke_cluster_id" {
  description = "OCID of the OKE cluster for monitoring"
  type        = string
}

variable "services" {
  description = "List of service names to create log groups for"
  type        = list(string)
  default = [
    "user-service",
    "order-service",
    "catalogue-service",
    "dispatch-service",
    "location-service",
    "notification-service",
    "payment-service"
  ]
}
