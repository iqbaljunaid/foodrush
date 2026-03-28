variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "load_balancer_id" {
  description = "OCID of the OCI Load Balancer to attach WAF to"
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

variable "rate_limit_requests_per_second" {
  description = "Maximum requests per second per IP for DDoS protection"
  type        = number
  default     = 100
}

variable "allowed_http_methods" {
  description = "HTTP methods allowed through the WAF"
  type        = list(string)
  default     = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
}

variable "ip_rate_limit_action_duration_in_seconds" {
  description = "Duration in seconds to block an IP after exceeding rate limit"
  type        = number
  default     = 60
}
