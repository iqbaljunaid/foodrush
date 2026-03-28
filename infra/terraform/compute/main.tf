terraform {
  required_version = ">= 1.9.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.0"
    }
  }
}

locals {
  prefix = "${var.project}-${var.environment}"
}

# --- OKE Cluster ---
resource "oci_containerengine_cluster" "main" {
  compartment_id     = var.compartment_id
  kubernetes_version = var.kubernetes_version
  name               = "${local.prefix}-oke-cluster-01"
  vcn_id             = var.vcn_id

  endpoint_config {
    is_public_ip_enabled = true
    subnet_id            = var.public_subnet_id
    nsg_ids              = [var.nsg_app_id]
  }

  options {
    service_lb_subnet_ids = [var.public_subnet_id]

    kubernetes_network_config {
      pods_cidr     = "10.244.0.0/16"
      services_cidr = "10.96.0.0/16"
    }

    admission_controller_options {
      is_pod_security_policy_enabled = false
    }
  }

  cluster_pod_network_options {
    cni_type = "OCI_VCN_IP_NATIVE"
  }
}

# --- Node Pool AD-1 ---
resource "oci_containerengine_node_pool" "ad1" {
  compartment_id     = var.compartment_id
  cluster_id         = oci_containerengine_cluster.main.id
  kubernetes_version = var.kubernetes_version
  name               = "${local.prefix}-nodepool-ad1"

  node_shape = var.node_shape

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gb
  }

  node_source_details {
    source_type = "IMAGE"
    image_id    = var.node_image_id
  }

  node_config_details {
    size = var.node_pool_size

    placement_configs {
      availability_domain = var.availability_domains[0]
      subnet_id           = var.app_subnet_id
    }

    nsg_ids = [var.nsg_app_id]
  }

  ssh_public_key = var.ssh_public_key

  initial_node_labels {
    key   = "app.kubernetes.io/part-of"
    value = "ubereats"
  }
}

# --- Node Pool AD-2 ---
resource "oci_containerengine_node_pool" "ad2" {
  compartment_id     = var.compartment_id
  cluster_id         = oci_containerengine_cluster.main.id
  kubernetes_version = var.kubernetes_version
  name               = "${local.prefix}-nodepool-ad2"

  node_shape = var.node_shape

  node_shape_config {
    ocpus         = var.node_ocpus
    memory_in_gbs = var.node_memory_gb
  }

  node_source_details {
    source_type = "IMAGE"
    image_id    = var.node_image_id
  }

  node_config_details {
    size = var.node_pool_size

    placement_configs {
      availability_domain = var.availability_domains[1]
      subnet_id           = var.app_subnet_id
    }

    nsg_ids = [var.nsg_app_id]
  }

  ssh_public_key = var.ssh_public_key

  initial_node_labels {
    key   = "app.kubernetes.io/part-of"
    value = "ubereats"
  }
}
