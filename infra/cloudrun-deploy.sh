#!/bin/bash

# EcoPulse Cloud Run Deployment Script
# Usage: ./infra/cloudrun-deploy.sh

set -e

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Required variables
PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}

if [ "$PROJECT_ID" = "your-project-id" ]; then
    echo "Error: GCP_PROJECT_ID not set. Please set it in .env or export it."
    exit 1
fi

echo "Deploying EcoPulse services to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Services to deploy
SERVICES=("gateway-api" "agent-harvester" "agent-insight" "agent-planner" "agent-assistant")
PORTS=(8080 8081 8082 8083 8084)

# Build and deploy each service
for i in "${!SERVICES[@]}"; do
    SERVICE=${SERVICES[$i]}
    PORT=${PORTS[$i]}
    IMAGE_NAME="gcr.io/$PROJECT_ID/ecopulse-$SERVICE"
    TIMESTAMP=$(date +%Y%m%d%H%M%S)
    IMAGE_TAG="$IMAGE_NAME:$TIMESTAMP"
    LATEST_TAG="$IMAGE_NAME:latest"
    
    echo "=========================================="
    echo "Building and deploying $SERVICE..."
    echo "=========================================="
    
    # Build Docker image
    echo "Building Docker image..."
    cd services/$SERVICE
    
    # Build with context at services level to include common
    cd ../..
    docker build -f services/$SERVICE/Dockerfile -t $IMAGE_TAG -t $LATEST_TAG --build-arg BUILDKIT_INLINE_CACHE=1 services/
    
    # Push to GCR
    echo "Pushing to Google Container Registry..."
    docker push $IMAGE_TAG
    docker push $LATEST_TAG
    
    # Deploy to Cloud Run
    echo "Deploying to Cloud Run..."
    gcloud run deploy "ecopulse-$SERVICE" \
        --image $IMAGE_TAG \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port $PORT \
        --memory 512Mi \
        --cpu 1 \
        --timeout 300 \
        --max-instances 10 \
        --set-env-vars "MOCK=0,GCP_PROJECT_ID=$PROJECT_ID,REGION=$REGION" \
        --quiet
    
    echo "$SERVICE deployed successfully!"
    echo ""
done

echo "=========================================="
echo "All services deployed successfully!"
echo "=========================================="
echo ""
echo "Service URLs:"
for SERVICE in "${SERVICES[@]}"; do
    URL=$(gcloud run services describe "ecopulse-$SERVICE" --platform managed --region $REGION --format 'value(status.url)')
    echo "  $SERVICE: $URL"
done

