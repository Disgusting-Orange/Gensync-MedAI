<#
.SYNOPSIS
    GenSync-Cache: Infrastructure Teardown Safeguard Script (PowerShell)
#>
param(
    [string]$Region = "ap-south-1",
    [string]$EcrRepo = "gensync-slm-tier2"
)

$ErrorActionPreference = "Stop"

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "          GenSync-Cache Infrastructure Teardown Safeguard         " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Target AWS Region : $Region"
Write-Host "Current Directory : $(Get-Location)"
Write-Host "Terraform Dir     : infra/terraform"
Write-Host ""
Write-Host "[WARNING] This script will tear down all deployed GenSync-Cache application" -ForegroundColor Yellow
Write-Host "resources managed by Terraform in $Region." -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: The AWS Budget and CloudTrail management trail are retained to prevent"
Write-Host "accidental cost overruns and maintain audit history."
Write-Host "=================================================================="

$confirmTf = Read-Host "Are you sure you want to run 'terraform destroy'? (type 'yes' to proceed)"
if ($confirmTf -ne "yes") {
    Write-Host "Teardown aborted by user." -ForegroundColor Yellow
    exit 0
}

if (Test-Path "infra/terraform") {
    Write-Host "`n--> Running terraform destroy in infra/terraform..." -ForegroundColor Cyan
    Push-Location "infra/terraform"
    try {
        terraform destroy -auto-approve
    } finally {
        Pop-Location
    }
    Write-Host "--> Terraform destroy completed." -ForegroundColor Green
} else {
    Write-Host "--> No infra/terraform directory found. Skipping terraform destroy."
}

Write-Host "`nChecking project-owned ECR images for repository: $EcrRepo..."
$confirmEcr = Read-Host "Do you want to delete all Docker images inside '$EcrRepo'? (type 'yes' to proceed)"
if ($confirmEcr -eq "yes") {
    try {
        $images = aws ecr list-images --repository-name $EcrRepo --region $Region --query 'imageIds[*]' --output json 2>$null | ConvertFrom-Json
        if ($images -and $images.Count -gt 0) {
            $formattedIds = ($images | ForEach-Object { "imageDigest=$($_.imageDigest)" }) -join " "
            aws ecr batch-delete-image --repository-name $EcrRepo --region $Region --image-ids $formattedIds
            Write-Host "--> Purged project images." -ForegroundColor Green
        } else {
            Write-Host "--> No images found in $EcrRepo."
        }
    } catch {
        Write-Host "--> ECR repository '$EcrRepo' does not exist or was already removed."
    }
}

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "                   Remaining Resource Verification                " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "Checking for remaining GenSync resources in $Region..."

Write-Host "`nDynamoDB Tables:" -ForegroundColor Yellow
aws dynamodb list-tables --region $Region --query "TableNames[?contains(@, 'gensync')]" --output text

Write-Host "`nLambda Functions:" -ForegroundColor Yellow
aws lambda list-functions --region $Region --query "Functions[?contains(FunctionName, 'gensync')].FunctionName" --output text

Write-Host "`nAPI Gateway APIs:" -ForegroundColor Yellow
aws apigatewayv2 get-apis --region $Region --query "Items[?contains(Name, 'gensync')].Name" --output text

Write-Host "`nSNS Topics:" -ForegroundColor Yellow
aws sns list-topics --region $Region --query "Topics[?contains(TopicArn, 'ClinicalEmergencyTriage')].TopicArn" --output text

Write-Host "`n==================================================================" -ForegroundColor Cyan
Write-Host "[IMPORTANT NOTICE]" -ForegroundColor Red
Write-Host "Teardown script has completed. Please note:"
Write-Host "1. Verify your AWS Billing Console (Cost Explorer / Free Tier page)."
Write-Host "2. Billing metrics and data in AWS Cost Explorer may experience up to a 24-hour reporting delay."
Write-Host "3. Undeployed resources, retained S3 buckets, or lingering CloudWatch logs may still incur storage fees."
Write-Host "==================================================================" -ForegroundColor Cyan
