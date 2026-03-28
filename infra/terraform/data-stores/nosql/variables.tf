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

variable "table_max_read_units" {
  description = "Maximum read units per table"
  type        = number
  default     = 50
}

variable "table_max_write_units" {
  description = "Maximum write units per table"
  type        = number
  default     = 50
}

variable "table_max_storage_gb" {
  description = "Maximum storage in GB per table"
  type        = number
  default     = 25
}
