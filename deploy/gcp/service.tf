# The Cloud Run service
resource "google_cloud_run_service" "label-studio" {
  name                       = local.service_name
  location                   = var.region
  autogenerate_revision_name = true

  template {
    spec {
      service_account_name = google_service_account.label_studio_worker.email
      containers {
        image = "gcr.io/${var.project}/${local.service_name}"
        env {
          name  = "DEBUG"
          value = "True"
        }
        env {
          name  = "LOG_LEVEL"
          value = "DEBUG"
        }
        env {
          name  = "DJANGO_DB"
          value = "default"
        }
        env {
          name  = "POSTGRE_USER"
          value = "postgres"
        }
        env {
          name  = "POSTGRE_PASSWORD"
          value = google_sql_user.users.password
        }
        env {
          name  = "POSTGRE_NAME"
          value = "postgres"
        }
        env {
          name  = "POSTGRE_HOST"
          value = "/cloudsql/${google_sql_database_instance.label-studio-postgres.connection_name}"
        }
        env {
          name  = "POSTGRE_PORT"
          value = "5432"
        }
        env {
          name  = "GOOGLE_LOGGING_ENABLED"
          value = "True"
        }
      }
    }

    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale"      = "1000"
        "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.label-studio-postgres.connection_name
        "run.googleapis.com/client-name"        = "terraform"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [google_project_service.run, google_sql_database_instance.label-studio-postgres]
}

# Set service public
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location = google_cloud_run_service.label-studio.location
  project  = google_cloud_run_service.label-studio.project
  service  = google_cloud_run_service.label-studio.name

  policy_data = data.google_iam_policy.noauth.policy_data
  depends_on  = [google_cloud_run_service.label-studio]
}

resource "google_cloud_run_domain_mapping" "default" {
  location = var.region
  name     = var.domain_name

  metadata {
    namespace = var.project
  }

  spec {
    route_name = google_cloud_run_service.label-studio.name
  }
}
