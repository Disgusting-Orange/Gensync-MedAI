# ==============================================================================
# GenSync-Cache: Main Serverless Infrastructure Configuration
# Target: AWS ap-south-1 (Mumbai)
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Operational Notification: SNS Emergency Topic
# ------------------------------------------------------------------------------
resource "aws_sns_topic" "clinical_emergency" {
  name         = "ClinicalEmergencyTriage"
  display_name = "Clinical Emergency Triage Notification"
}

resource "aws_sns_topic_subscription" "emergency_email" {
  topic_arn = aws_sns_topic.clinical_emergency.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ------------------------------------------------------------------------------
# 2. Database Layer: Amazon DynamoDB (PAY_PER_REQUEST, Zero Idle Cost)
# ------------------------------------------------------------------------------

# Table 1: Cluster Centroids (Stage 1 Pruning)
resource "aws_dynamodb_table" "cluster_centroids" {
  name         = "gensync_cluster_centroids"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "cluster_id"

  attribute {
    name = "cluster_id"
    type = "S"
  }
}

# Table 2: Semantic Query Cache (Stage 2 Vector Candidates)
resource "aws_dynamodb_table" "semantic_cache" {
  name         = "gensync_semantic_query_cache"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "entry_id"

  attribute {
    name = "entry_id"
    type = "S"
  }

  attribute {
    name = "cluster_id"
    type = "S"
  }

  global_secondary_index {
    name            = "cluster_id-index"
    hash_key        = "cluster_id"
    projection_type = "ALL"
  }
}

# Table 3: Triage Audit Log (Privacy Invariant: Zero Raw Clinical Queries)
resource "aws_dynamodb_table" "triage_audit_log" {
  name         = "gensync_triage_audit_log"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "audit_id"

  attribute {
    name = "audit_id"
    type = "S"
  }

  attribute {
    name = "query_sha256"
    type = "S"
  }

  global_secondary_index {
    name            = "query_sha256-index"
    hash_key        = "query_sha256"
    projection_type = "ALL"
  }
}

# Table 4: SLM Review Queue (Quarantined AI Output Buffer)
resource "aws_dynamodb_table" "slm_review_queue" {
  name         = "gensync_slm_review_queue"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "queue_id"

  attribute {
    name = "queue_id"
    type = "S"
  }
}

# ------------------------------------------------------------------------------
# 3. Observability: CloudWatch Log Group (7-day retention)
# ------------------------------------------------------------------------------
resource "aws_cloudwatch_log_group" "tier1_logs" {
  name              = "/aws/lambda/gensync-tier1-handler"
  retention_in_days = 7
}

# ------------------------------------------------------------------------------
# 4. IAM Role & Least-Privilege Execution Policy
# ------------------------------------------------------------------------------
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "tier1_lambda_role" {
  name               = "gensync-tier1-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "tier1_permissions" {
  # CloudWatch Logging
  statement {
    sid    = "CloudWatchLogging"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "${aws_cloudwatch_log_group.tier1_logs.arn}:*"
    ]
  }

  # DynamoDB Operations
  statement {
    sid    = "DynamoDBTableAccess"
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:Scan",
      "dynamodb:BatchWriteItem"
    ]
    resources = [
      aws_dynamodb_table.cluster_centroids.arn,
      aws_dynamodb_table.semantic_cache.arn,
      "${aws_dynamodb_table.semantic_cache.arn}/index/*",
      aws_dynamodb_table.triage_audit_log.arn,
      "${aws_dynamodb_table.triage_audit_log.arn}/index/*",
      aws_dynamodb_table.slm_review_queue.arn
    ]
  }

  # SNS Publishing for Emergency Triage
  statement {
    sid    = "SNSEmergencyPublish"
    effect = "Allow"
    actions = [
      "sns:Publish"
    ]
    resources = [
      aws_sns_topic.clinical_emergency.arn
    ]
  }
}

resource "aws_iam_policy" "tier1_policy" {
  name        = "gensync-tier1-execution-policy"
  description = "Least-privilege policy for GenSync Tier-1 Lambda function"
  policy      = data.aws_iam_policy_document.tier1_permissions.json
}

resource "aws_iam_role_policy_attachment" "tier1_attach" {
  role       = aws_iam_role.tier1_lambda_role.name
  policy_arn = aws_iam_policy.tier1_policy.arn
}

# ------------------------------------------------------------------------------
# 5. Compute Layer: Tier-1 Serverless Lambda (Python 3.11, INT8 ONNX)
# ------------------------------------------------------------------------------

# Lambda Layer for Linux x86_64 ML Runtime Dependencies (onnxruntime, tokenizers, numpy)
resource "aws_lambda_layer_version" "tier1_dependencies" {
  filename            = "${path.module}/../../build/tier1_layer.zip"
  layer_name          = "gensync-tier1-dependencies"
  description         = "Linux x86_64 ML runtime dependencies (onnxruntime, tokenizers, numpy)"
  compatible_runtimes = ["python3.11"]
  source_code_hash    = filebase64sha256("${path.module}/../../build/tier1_layer.zip")
}

resource "aws_lambda_function" "tier1_handler" {
  function_name    = "gensync-tier1-handler"
  description      = "GenSync-Cache Tier-1 Safety & Semantic Retrieval Handler"
  role             = aws_iam_role.tier1_lambda_role.arn
  handler          = "src.tier1.handler.lambda_handler"
  runtime          = "python3.11"
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout
  filename         = "${path.module}/../../build/tier1_lambda.zip"
  source_code_hash = filebase64sha256("${path.module}/../../build/tier1_lambda.zip")

  layers = [
    aws_lambda_layer_version.tier1_dependencies.arn
  ]

  environment {
    variables = {
      EMERGENCY_NUMBER            = var.emergency_number
      COSINE_THRESHOLD            = tostring(var.cosine_threshold)
      DYNAMODB_TABLE_CACHE        = aws_dynamodb_table.semantic_cache.name
      DYNAMODB_TABLE_CENTROIDS    = aws_dynamodb_table.cluster_centroids.name
      DYNAMODB_TABLE_AUDIT        = aws_dynamodb_table.triage_audit_log.name
      DYNAMODB_TABLE_REVIEW_QUEUE = aws_dynamodb_table.slm_review_queue.name
      SNS_TOPIC_ARN               = aws_sns_topic.clinical_emergency.arn
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.tier1_logs,
    aws_iam_role_policy_attachment.tier1_attach
  ]
}

# ------------------------------------------------------------------------------
# 6. Ingress: Amazon API Gateway HTTP API (CORS enabled)
# ------------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "http_api" {
  name          = "gensync-http-api"
  protocol_type = "HTTP"
  description   = "Serverless API Gateway for GenSync-Cache clinical Q&A"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["Content-Type", "X-Correlation-ID", "Authorization"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.tier1_handler.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "query_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "POST /query"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_route" "default_route" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default_stage" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigateway_invoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.tier1_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
