terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 3.80"
    }
  }
}

provider "google" {
  project = var.project
}

locals {
  service_folder = "service"
  service_name   = "label-studio"

  deployment_name        = "label-studio"
  label_studio_worker_sa = "serviceAccount:${google_service_account.label_studio_worker.email}"
}
