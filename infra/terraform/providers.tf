provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "GenSync-Cache"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Course      = "CAD"
    }
  }
}
