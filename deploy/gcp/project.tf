# Enable services
resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  service            = "iam.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Create a service account
resource "google_service_account" "label_studio_worker" {
  account_id   = "label-studio-worker"
  display_name = "Label Studio SA"
}

# Set permissions
resource "google_project_iam_binding" "service_permissions" {
  for_each = toset([
    "logging.logWriter", "cloudsql.client"
  ])

  role       = "roles/${each.key}"
  members    = [local.label_studio_worker_sa]
  depends_on = [google_service_account.label_studio_worker]
}
