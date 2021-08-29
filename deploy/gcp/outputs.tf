output "service_url" {
  value = google_cloud_run_service.label-studio.status[0].url
}
