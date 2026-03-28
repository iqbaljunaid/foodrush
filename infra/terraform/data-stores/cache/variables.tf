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

variable "data_subnet_id" {
  description = "OCID of the data subnet"
  type        = string
}

variable "nsg_data_id" {
  description = "OCID of the data NSG"
  type        = string
}

variable "node_count" {
  description = "Number of cache nodes"
  type        = number
  default     = 3
}

variable "node_memory_gb" {
  description = "Memory per cache node in GB"
  type        = number
  default     = 8
}
