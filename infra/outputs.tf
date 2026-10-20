output "db_host" {
  description = "Host del cluster PostgreSQL en Neon para preprod"
  value       = neon_project.preprod.database_host
}

output "database" {
  description = "Nombre de la base de datos de preprod"
  value       = neon_database.preprod.name
}

output "api_url" {
  description = "URL publica del servicio API en Render"
  value       = render_web_service.api.url
}

output "front_url" {
  description = "URL publica del servicio Frontend en Render"
  value       = render_web_service.front.url
}
