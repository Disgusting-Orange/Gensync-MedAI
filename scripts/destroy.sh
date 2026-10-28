#!/usr/bin/env bash
# ==============================================================================
# GenSync-Cache: Teardown Safeguard Script
# ==============================================================================
set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
PROJECT_TAG="GenSync-Cache"
ECR_REPO_NAME="gensync-slm-tier2"

echo "=================================================================="
echo "          GenSync-Cache Infrastructure Teardown Safeguard         "
echo "=================================================================="
echo "Target AWS Region : ${REGION}"
echo "Current Directory : $(pwd)"
echo "Terraform Dir     : infra/terraform"
echo ""
echo "[WARNING] This script will tear down all deployed GenSync-Cache application"
echo "resources managed by Terraform in ${REGION}."
echo ""
echo "Note: The AWS Budget and CloudTrail management trail are retained to prevent"
echo "accidental cost overruns and maintain audit history. They can be removed"
echo "explicitly from the AWS Console or management module if desired."
echo "=================================================================="

# 1. Interactive confirmation for Terraform destroy
read -r -p "Are you sure you want to run 'terraform destroy'? (type 'yes' to proceed): " CONFIRM_TF
if [ "${CONFIRM_TF}" != "yes" ]; then
    echo "Teardown aborted by user."
    exit 0
fi

# 2. Run terraform destroy
if [ -d "infra/terraform" ]; then
    echo ""
    echo "--> Running terraform destroy in infra/terraform..."
    cd infra/terraform
    terraform destroy -auto-approve
    cd ../..
    echo "--> Terraform destroy completed."
else
    echo "--> No infra/terraform directory found. Skipping terraform destroy."
fi

# 3. Interactive confirmation for ECR cleanup
echo ""
echo "Checking project-owned ECR images for repository: ${ECR_REPO_NAME}..."
read -r -p "Do you want to delete all Docker images inside '${ECR_REPO_NAME}'? (type 'yes' to proceed): " CONFIRM_ECR
if [ "${CONFIRM_ECR}" == "yes" ]; then
    if aws ecr describe-repositories --repository-names "${ECR_REPO_NAME}" --region "${REGION}" >/dev/null 2>&1; then
        echo "--> Purging image digests in ${ECR_REPO_NAME}..."
        IMAGE_IDS=$(aws ecr list-images --repository-name "${ECR_REPO_NAME}" --region "${REGION}" --query 'imageIds[*]' --output json 2>/dev/null || echo "[]")
        if [ "${IMAGE_IDS}" != "[]" ] && [ -n "${IMAGE_IDS}" ]; then
            aws ecr batch-delete-image --repository-name "${ECR_REPO_NAME}" --region "${REGION}" --image-ids "${IMAGE_IDS}"
            echo "--> Purged project images."
        else
            echo "--> No images found in ${ECR_REPO_NAME}."
        fi
    else
        echo "--> ECR repository '${ECR_REPO_NAME}' does not exist or was already removed."
    fi
else
    echo "--> ECR cleanup skipped."
fi

# 4. Inventory check of remaining resources
echo ""
echo "=================================================================="
echo "                   Remaining Resource Verification                "
echo "=================================================================="
echo "Checking for remaining GenSync resources in ${REGION}:"

echo "DynamoDB Tables:"
aws dynamodb list-tables --region "${REGION}" --query "TableNames[?contains(@, 'gensync')]" --output text || true

echo "Lambda Functions:"
aws lambda list-functions --region "${REGION}" --query "Functions[?contains(FunctionName, 'gensync')].FunctionName" --output text || true

echo "API Gateway APIs:"
aws apigatewayv2 get-apis --region "${REGION}" --query "Items[?contains(Name, 'gensync')].Name" --output text || true

echo "SNS Topics:"
aws sns list-topics --region "${REGION}" --query "Topics[?contains(TopicArn, 'ClinicalEmergencyTriage')].TopicArn" --output text || true

echo "=================================================================="
echo "[IMPORTANT NOTICE]"
echo "Teardown script has completed. Please note:"
echo "1. Verify your AWS Billing Console (Cost Explorer / Free Tier page)."
echo "2. Billing metrics and data in AWS Cost Explorer may experience up to a"
echo "   24-hour reporting delay."
echo "3. Undeployed resources, retained S3 buckets, or lingering CloudWatch logs"
echo "   may still incur storage fees if not empty."
echo "=================================================================="
