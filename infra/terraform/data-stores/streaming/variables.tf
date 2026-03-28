variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "prod"
}

variable "project" {
  description = "Project name prefix"
  type        = string
  default     = "ubereats"
}

variable "partitions" {
  description = "Number of partitions per stream"
  type        = number
  default     = 3
}

variable "retention_in_hours" {
  description = "Message retention in hours"
  type        = number
  default     = 168
}
