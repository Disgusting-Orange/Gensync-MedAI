output "api_endpoint" {
  description = "Base invocation URL for the API Gateway HTTP API."
  value       = aws_apigatewayv2_stage.default_stage.invoke_url
}

output "query_endpoint" {
  description = "Full URL for POST /query endpoint."
  value       = "${aws_apigatewayv2_stage.default_stage.invoke_url}query"
}

output "lambda_function_name" {
  description = "Deployed Tier-1 Lambda function name."
  value       = aws_lambda_function.tier1_handler.function_name
}

output "dynamodb_tables" {
  description = "Names of provisioned DynamoDB tables."
  value = {
    cluster_centroids = aws_dynamodb_table.cluster_centroids.name
    semantic_cache    = aws_dynamodb_table.semantic_cache.name
    triage_audit_log  = aws_dynamodb_table.triage_audit_log.name
    slm_review_queue  = aws_dynamodb_table.slm_review_queue.name
  }
}

output "sns_topic_arn" {
  description = "ARN of the Clinical Emergency Triage SNS Topic."
  value       = aws_sns_topic.clinical_emergency.arn
}
