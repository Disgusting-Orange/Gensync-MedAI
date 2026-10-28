variable "aws_region" {
  description = "The target AWS region for deployment."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Execution environment name."
  type        = string
  default     = "dev"
}

variable "emergency_number" {
  description = "Configured regional emergency response number."
  type        = string
  default     = "112"
}

variable "cosine_threshold" {
  description = "Similarity threshold for semantic cache hits."
  type        = number
  default     = 0.92
}

variable "alert_email" {
  description = "Verified email address for emergency triage alerts."
  type        = string
  default     = "kamaleshn2006@gmail.com"
}

variable "lambda_memory_size" {
  description = "Memory allocation for Tier-1 Lambda (MB)."
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Execution timeout for Tier-1 Lambda in seconds."
  type        = number
  default     = 30
}

variable "enable_rds_fallback" {
  description = "Flag to enable optional RDS PostgreSQL module (disabled by default)."
  type        = bool
  default     = false
}
