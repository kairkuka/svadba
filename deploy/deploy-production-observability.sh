#!/usr/bin/env bash
set -euo pipefail

REGION="${AWS_REGION_OVERRIDE:-eu-central-1}"
APP_NAME="${EB_APP_NAME:-svadba-kz}"
ENV_NAME="${EB_ENV_NAME:-svadba-kz-prod-euc1}"
BUCKET="${EB_BUCKET:-elasticbeanstalk-eu-central-1-760050152822}"
DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E2GVVNUQRT8E3D}"
RELEASE_FILE="${1:-/home/cloudshell-user/svadba-prod-observability-20261021-1518.zip}"
VERSION_LABEL="${VERSION_LABEL:-prod-20261021-observability-v1-euc1}"
EXPECTED_SHA256="${EXPECTED_SHA256:-309ac29819e0b6c5efd69426221a0abbf51bbce35d03ab31e296eed895db0f3c}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://d2ne1y5a2elsg5.cloudfront.net}"

if [[ ! -f "$RELEASE_FILE" ]]; then
  echo "Release file not found: $RELEASE_FILE" >&2
  exit 1
fi

ACTUAL_SHA256="$(sha256sum "$RELEASE_FILE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
  echo "Release checksum mismatch" >&2
  exit 1
fi

S3_KEY="releases/${VERSION_LABEL}.zip"
aws s3 cp "$RELEASE_FILE" "s3://${BUCKET}/${S3_KEY}" --region "$REGION" --only-show-errors

if ! aws elasticbeanstalk describe-application-versions \
  --application-name "$APP_NAME" \
  --version-labels "$VERSION_LABEL" \
  --region "$REGION" \
  --query 'ApplicationVersions[0].VersionLabel' \
  --output text | grep -qx "$VERSION_LABEL"; then
  aws elasticbeanstalk create-application-version \
    --application-name "$APP_NAME" \
    --version-label "$VERSION_LABEL" \
    --source-bundle "S3Bucket=${BUCKET},S3Key=${S3_KEY}" \
    --region "$REGION" >/dev/null
fi

aws elasticbeanstalk update-environment \
  --environment-name "$ENV_NAME" \
  --version-label "$VERSION_LABEL" \
  --option-settings \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CLIENT_ERROR_MONITORING,Value=cloudwatch \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CLIENT_ERROR_RATE_LIMIT_WINDOW_MS,Value=900000 \
    Namespace=aws:elasticbeanstalk:application:environment,OptionName=CLIENT_ERROR_RATE_LIMIT_MAX,Value=60 \
  --region "$REGION" >/dev/null

echo "Waiting for Elastic Beanstalk deployment..."
for attempt in $(seq 1 60); do
  read -r STATUS HEALTH VERSION <<<"$(aws elasticbeanstalk describe-environments \
    --environment-names "$ENV_NAME" \
    --region "$REGION" \
    --query 'Environments[0].[Status,Health,VersionLabel]' \
    --output text)"
  printf 'attempt=%s status=%s health=%s version=%s\n' "$attempt" "$STATUS" "$HEALTH" "$VERSION"
  if [[ "$STATUS" == "Ready" && "$HEALTH" == "Green" && "$VERSION" == "$VERSION_LABEL" ]]; then
    break
  fi
  if [[ "$attempt" == "60" ]]; then
    echo "Elastic Beanstalk did not become Ready/Green" >&2
    exit 1
  fi
  sleep 15
done

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths '/*' \
  --query 'Invalidation.Id' \
  --output text

LOG_GROUP="$(aws logs describe-log-groups \
  --log-group-name-prefix "/aws/elasticbeanstalk/${ENV_NAME}" \
  --region "$REGION" \
  --query "logGroups[?contains(logGroupName, 'web.stdout')].logGroupName | [0]" \
  --output text)"

if [[ -z "$LOG_GROUP" || "$LOG_GROUP" == "None" ]]; then
  echo "Elastic Beanstalk web stdout log group not found" >&2
  exit 1
fi

aws logs put-metric-filter \
  --log-group-name "$LOG_GROUP" \
  --filter-name SvadbaClientErrorMarker \
  --filter-pattern '"CLIENT_ERROR"' \
  --metric-transformations metricName=ClientErrors,metricNamespace=Svadba/Production,metricValue=1,defaultValue=0 \
  --region "$REGION"

aws logs put-metric-filter \
  --log-group-name "$LOG_GROUP" \
  --filter-name SvadbaServerErrorMarker \
  --filter-pattern '"SERVER_ERROR"' \
  --metric-transformations metricName=ServerErrors,metricNamespace=Svadba/Production,metricValue=1,defaultValue=0 \
  --region "$REGION"

aws cloudwatch put-metric-alarm \
  --alarm-name svadba-prod-client-errors \
  --alarm-description 'Five or more client error reports in five minutes' \
  --namespace Svadba/Production \
  --metric-name ClientErrors \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION"

aws cloudwatch put-metric-alarm \
  --alarm-name svadba-prod-server-errors \
  --alarm-description 'Three or more server errors in five minutes' \
  --namespace Svadba/Production \
  --metric-name ServerErrors \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 3 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --treat-missing-data notBreaching \
  --region "$REGION"

curl -fsS "${PUBLIC_ORIGIN}/health"
echo
curl -fsS -X POST "${PUBLIC_ORIGIN}/api/client-errors" \
  -H 'Content-Type: application/json' \
  --data '{"message":"production monitoring smoke","source":"release-script","fatal":false}'
echo

echo "Deployment complete: ${VERSION_LABEL}"
