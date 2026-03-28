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

variable "mysql_shape" {
  description = "MySQL DB system shape"
  type        = string
  default     = "MySQL.HeatWave.VM.Standard"
}

variable "mysql_admin_username" {
  description = "MySQL admin username"
  type        = string
  default     = "admin"
}

variable "mysql_admin_password" {
  description = "MySQL admin password"
  type        = string
  sensitive   = true
}

variable "mysql_data_storage_gb" {
  description = "Data storage size in GB"
  type        = number
  default     = 50
}

variable "availability_domain" {
  description = "Availability domain for primary instance"
  type        = string
}

