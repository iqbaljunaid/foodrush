variable "compartment_id" {
  description = "OCI compartment OCID"
  type        = string
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

variable "project" {
  description = "Project name prefix for resource naming"
  type        = string
  default     = "ubereats"
}

variable "vcn_cidr_block" {
  description = "CIDR block for the VCN"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet (load balancers, API gateway)"
  type        = string
  default     = "10.0.0.0/24"
}

variable "private_subnet_app_cidr" {
  description = "CIDR block for the private application subnet (OKE worker nodes)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_data_cidr" {
  description = "CIDR block for the private data subnet (MySQL, Redis, NoSQL)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "region" {
  description = "OCI region"
  type        = string
}
