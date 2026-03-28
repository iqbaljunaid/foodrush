output "waf_policy_id" {
  description = "OCID of the WAF policy"
  value       = oci_waf_web_app_firewall_policy.main.id
}

output "waf_firewall_id" {
  description = "OCID of the WAF firewall instance attached to the load balancer"
  value       = oci_waf_web_app_firewall.main.id
}
