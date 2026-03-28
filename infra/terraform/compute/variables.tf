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

variable "kubernetes_version" {
  description = "Kubernetes version for OKE cluster"
  type        = string
  default     = "v1.32.1"
}

variable "vcn_id" {
  description = "OCID of the VCN"
  type        = string
}

variable "app_subnet_id" {
  description = "OCID of the application subnet for worker nodes"
  type        = string
}

variable "public_subnet_id" {
  description = "OCID of the public subnet for the K8s API endpoint"
  type        = string
}

variable "nsg_app_id" {
  description = "OCID of the application NSG"
  type        = string
}

variable "node_shape" {
  description = "Shape for OKE worker nodes"
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "node_ocpus" {
  description = "Number of OCPUs per worker node"
  type        = number
  default     = 2
}

variable "node_memory_gb" {
  description = "Memory in GB per worker node"
  type        = number
  default     = 16
}

variable "node_pool_size" {
  description = "Number of nodes per node pool"
  type        = number
  default     = 2
}

variable "node_image_id" {
  description = "OCID of the OKE node image"
  type        = string
}

variable "availability_domains" {
  description = "List of availability domain names (AD-1, AD-2)"
  type        = list(string)
}

variable "ssh_public_key" {
  description = "SSH public key for node access"
  type        = string
  sensitive   = true
}
