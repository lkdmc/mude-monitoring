terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ── SSH Key Pair ──────────────────────────────────────────────
resource "aws_key_pair" "deployer" {
  key_name   = "mude-monitoring-key"
  public_key = file("${path.module}/mude-monitoring-key.pub")
}

# ── Security Group ────────────────────────────────────────────
resource "aws_security_group" "monitoring" {
  name        = "mude-monitoring-sg"
  description = "Allow HTTP, HTTPS, SSH"

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Frontend"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend"
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── EC2 Instance ──────────────────────────────────────────────
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

resource "aws_instance" "monitoring" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.monitoring.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2_profile.name

  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y docker.io docker-compose-plugin git
    systemctl enable docker
    systemctl start docker
    usermod -aG docker ubuntu
  EOF

  tags = {
    Name = "mude-monitoring"
  }
}

# ── IAM Role for EC2 (allows SNS publish) ────────────────────
resource "aws_iam_role" "ec2_role" {
  name = "mude-monitoring-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "sns_publish" {
  name = "mude-monitoring-sns-publish"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "sns:Publish"
      Resource = aws_sns_topic.alerts.arn
    }]
  })
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "mude-monitoring-ec2-profile"
  role = aws_iam_role.ec2_role.name
}

# ── SNS Topic ─────────────────────────────────────────────────
resource "aws_sns_topic" "alerts" {
  name = "mude-monitoring-alerts"
}


# ── CloudWatch Alarms ─────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "mude-monitoring-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU usage exceeded 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.monitoring.id
  }
}

resource "aws_cloudwatch_metric_alarm" "status_check" {
  alarm_name          = "mude-monitoring-status-check"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "StatusCheckFailed"
  namespace           = "AWS/EC2"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  alarm_description   = "EC2 status check failed"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    InstanceId = aws_instance.monitoring.id
  }
}
