output "ec2_public_ip" {
  description = "EC2 instance public IP"
  value       = aws_instance.monitoring.public_ip
}

output "ec2_public_dns" {
  description = "EC2 instance public DNS"
  value       = aws_instance.monitoring.public_dns
}
