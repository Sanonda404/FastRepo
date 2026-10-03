terraform {
  required_version = ">= 1.6"
}

resource "aws_instance" "api" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"
  tags = { Name = "acme-api", Env = "prod" }
}

resource "aws_s3_bucket" "assets" {
  bucket = "acme-static-assets"
}
