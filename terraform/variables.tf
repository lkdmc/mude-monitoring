variable "region" {
  default = "eu-west-1"
}

variable "instance_type" {
  default = "t3.micro"
}

variable "alert_emails" {
  description = "List of email addresses for CloudWatch alarm notifications"
  type        = list(string)
}
