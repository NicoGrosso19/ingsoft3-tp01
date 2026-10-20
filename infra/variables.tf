variable "neon_org_id" {
  type        = string
  description = "ID de la organizacion en Neon"
  default     = "org-silent-bread-82823361"
}

variable "image_repo_api" {
  type        = string
  description = "Repositorio de la imagen del backend en GHCR (sin etiqueta)"
  default     = "ghcr.io/nicogrosso19/ingsoft3-tp01-backend"
}

variable "image_repo_front" {
  type        = string
  description = "Repositorio de la imagen del frontend en GHCR (sin etiqueta)"
  default     = "ghcr.io/nicogrosso19/ingsoft3-tp01-frontend"
}

variable "image_tag" {
  type        = string
  description = "Etiqueta inmutable de la imagen del TP7 (commit SHA)"
  default     = "sha-85adfb956e13814312e3fa81b7666bee5eb0fea1"
}

variable "region" {
  type        = string
  description = "Region de Render para los servicios (frankfurt, ohio, oregon, singapore, virginia)"
  default     = "ohio"
}
