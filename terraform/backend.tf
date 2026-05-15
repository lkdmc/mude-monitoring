terraform {
  backend "s3" {
    bucket  = "mude-monitoring-tfstate"
    key     = "monitoring/terraform.tfstate"
    region  = "eu-west-1"
  }
}
