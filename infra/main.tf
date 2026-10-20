terraform {
  required_version = ">= 1.5"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0" # fijada segun consigna de catedra
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
  }
}

provider "neon" {}   # lee NEON_API_KEY del entorno
provider "render" {} # lee RENDER_API_KEY y RENDER_OWNER_ID del entorno

# --- Base de datos Neon para PREPROD ---

resource "neon_project" "preprod" {
  name   = "ingsoft3-tp01-preprod"
  org_id = var.neon_org_id

  # Limite obligatorio para el plan gratuito de Neon: 21600 segundos (6 horas)
  history_retention_seconds = 21600
}

resource "neon_role" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod_owner"
}

resource "neon_database" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod"
  owner_name = neon_role.preprod.name
}

# --- Servicios en Render para PREPROD ---

locals {
  # La cadena de conexion se deriva de los atributos devueltos por Neon
  conn = "Host=${neon_project.preprod.database_host};Database=${neon_database.preprod.name};Username=${neon_role.preprod.name};Password=${neon_role.preprod.password};SSL Mode=Require"
}

resource "render_web_service" "api" {
  name   = "ingsoft3-tp01-api-preprod"
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_api # sin la etiqueta
      tag       = var.image_tag      # etiqueta en su propio campo
    }
  }

  env_vars = {
    ConnectionStrings__Default = { value = local.conn }
  }
}

resource "render_web_service" "front" {
  name   = "ingsoft3-tp01-front-preprod"
  plan   = "free"
  region = var.region

  runtime_source = {
    image = {
      image_url = var.image_repo_front
      tag       = var.image_tag
    }
  }

  env_vars = {
    BACKEND_URL  = { value = trimsuffix(render_web_service.api.url, "/") }
    DNS_RESOLVER = { value = "8.8.8.8" }
  }
}
