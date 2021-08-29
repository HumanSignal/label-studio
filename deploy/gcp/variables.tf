variable "project" {
  type        = string
  description = "Google Cloud Platform Project ID"
}

variable "region" {
  default = "us-central1"
  type    = string
}

variable "database_user" {
  default     = "postgres"
  type        = string
  description = "PostgresSQL user."
}

variable "database_password" {
  type        = string
  description = "PostgresSQL database user password."
}

variable "database_tier" {
  default     = "db-f1-micro"
  type        = string
  description = "PostgresSQL database tier."
}

variable "domain_name" {
  type        = string
  description = "Domain name where service will be served from."
}
