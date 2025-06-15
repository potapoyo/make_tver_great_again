terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1" # 東京リージョン
}

# 1. フロントエンド用S3バケット (静的ウェブサイトホスティング)
resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "vrc-link-tver.potapoyo.com"
}

resource "aws_s3_bucket_website_configuration" "frontend_website" {
  bucket = aws_s3_bucket.frontend_bucket.id

  index_document {
    suffix = "index.html"
  }
}

resource "aws_s3_bucket_public_access_block" "public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3バケットのコンテンツ
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.frontend_bucket.id
  key          = "index.html"
  source       = "../frontend/index.html"
  content_type = "text/html"
  etag         = filemd5("../frontend/index.html")
}

# S3バケットポリシー（パブリックアクセスを許可）
resource "aws_s3_bucket_policy" "bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  depends_on = [aws_s3_bucket_public_access_block.public_access]
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.frontend_bucket.arn}/*"
      }
    ]
  })
}


# 2. Lambda & API Gateway (変更なし)

# Lambda関数用のIAMロール
resource "aws_iam_role" "lambda_exec_role" {
  name = "tver-m3u8-lambda-exec-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Action    = "sts:AssumeRole",
      Effect    = "Allow",
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "../lambda/"
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "tver_m3u8_extractor" {
  function_name    = "tver-m3u8-extractor"
  role             = aws_iam_role.lambda_exec_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.9"
  timeout          = 30
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  layers           = [aws_lambda_layer_version.yt_dlp_layer.arn]
}

data "archive_file" "layer_zip" {
  type        = "zip"
  source_dir  = "../lambda/layer"
  output_path = "${path.module}/layer.zip"
}

resource "aws_lambda_layer_version" "yt_dlp_layer" {
  layer_name          = "yt-dlp-layer"
  filename            = data.archive_file.layer_zip.output_path
  source_code_hash    = data.archive_file.layer_zip.output_base64sha256
  compatible_runtimes = ["python3.9"]
}

resource "aws_apigatewayv2_api" "http_api" {
  name          = "tver-m3u8-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_origins = ["https://vrc-link-tver.potapoyo.com"] # ユーザーのドメインに限定
    allow_methods = ["POST", "OPTIONS"]
    allow_headers = ["Content-Type"]
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.http_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.tver_m3u8_extractor.invoke_arn
}

resource "aws_apigatewayv2_route" "post_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api_gw_permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tver_m3u8_extractor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

# 3. 出力
output "s3_website_endpoint" {
  description = "The S3 static website endpoint URL. Use this for your Cloudflare CNAME record."
  value       = aws_s3_bucket_website_configuration.frontend_website.website_endpoint
}

output "api_endpoint" {
  description = "The API Gateway endpoint URL. Your frontend will call this."
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}
