#!/bin/bash

# EcoPulse Smoke Test Script
# Tests basic functionality of all services

set -e

# Configuration
GATEWAY_URL=${GATEWAY_URL:-"http://localhost:8080"}
HARVESTER_URL=${HARVESTER_URL:-"http://localhost:8081"}
INSIGHT_URL=${INSIGHT_URL:-"http://localhost:8082"}
PLANNER_URL=${PLANNER_URL:-"http://localhost:8083"}
ASSISTANT_URL=${ASSISTANT_URL:-"http://localhost:8084"}
SITE=${SITE:-"plant-a"}

echo "=========================================="
echo "EcoPulse Smoke Tests"
echo "=========================================="
echo ""

# Test health endpoints
echo "1. Testing health endpoints..."
for SERVICE in gateway harvester insight planner assistant; do
    case $SERVICE in
        gateway) URL=$GATEWAY_URL ;;
        harvester) URL=$HARVESTER_URL ;;
        insight) URL=$INSIGHT_URL ;;
        planner) URL=$PLANNER_URL ;;
        assistant) URL=$ASSISTANT_URL ;;
    esac
    
    if curl -s "$URL/health" > /dev/null; then
        echo "  ✓ $SERVICE is healthy"
    else
        echo "  ✗ $SERVICE health check failed"
        exit 1
    fi
done

echo ""

# Create sample CSV
echo "2. Creating sample CSV..."
SAMPLE_CSV=$(cat <<EOF
timestamp,kw,cost_usd,co2_kg,temp_c
2024-01-01T00:00:00Z,50.5,6.06,25.25,20.5
2024-01-01T01:00:00Z,52.3,6.28,26.15,20.3
2024-01-01T02:00:00Z,48.7,5.84,24.35,19.8
2024-01-01T03:00:00Z,55.2,6.62,27.60,21.2
2024-01-01T04:00:00Z,49.1,5.89,24.55,20.1
EOF
)

echo "$SAMPLE_CSV" > /tmp/energy_sample.csv
echo "  ✓ Sample CSV created"

echo ""

# Test upload
echo "3. Testing CSV upload..."
UPLOAD_RESPONSE=$(curl -s -X POST -F "file=@/tmp/energy_sample.csv" "$GATEWAY_URL/upload?site=$SITE")
if echo "$UPLOAD_RESPONSE" | grep -q "rows_ingested"; then
    ROWS=$(echo "$UPLOAD_RESPONSE" | grep -o '"rows_ingested":[0-9]*' | grep -o '[0-9]*')
    echo "  ✓ Upload successful: $ROWS rows ingested"
else
    echo "  ✗ Upload failed: $UPLOAD_RESPONSE"
    exit 1
fi

echo ""

# Test harvester
echo "4. Testing harvester trigger..."
HARVESTER_RESPONSE=$(curl -s -X POST "$HARVESTER_URL/trigger?site=$SITE")
if echo "$HARVESTER_RESPONSE" | grep -q "success"; then
    echo "  ✓ Harvester triggered successfully"
else
    echo "  ✗ Harvester failed: $HARVESTER_RESPONSE"
    exit 1
fi

echo ""

# Test insight
echo "5. Testing insight analysis..."
INSIGHT_RESPONSE=$(curl -s -X POST "$INSIGHT_URL/analyze?site=$SITE")
if echo "$INSIGHT_RESPONSE" | grep -q "success"; then
    ANOMALIES=$(echo "$INSIGHT_RESPONSE" | grep -o '"anomalies":[0-9]*' | grep -o '[0-9]*' || echo "0")
    FORECAST=$(echo "$INSIGHT_RESPONSE" | grep -o '"forecasted":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "  ✓ Insight analysis complete: $ANOMALIES anomalies, $FORECAST forecast points"
else
    echo "  ✗ Insight analysis failed: $INSIGHT_RESPONSE"
    exit 1
fi

echo ""

# Test planner
echo "6. Testing planner..."
PLANNER_RESPONSE=$(curl -s -X POST "$PLANNER_URL/plan?site=$SITE")
if echo "$PLANNER_RESPONSE" | grep -q "success"; then
    ITEMS=$(echo "$PLANNER_RESPONSE" | grep -o '"items_count":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "  ✓ Plan generated: $ITEMS items"
else
    echo "  ✗ Planner failed: $PLANNER_RESPONSE"
    exit 1
fi

echo ""

# Test insights endpoint
echo "7. Testing insights retrieval..."
INSIGHTS_RESPONSE=$(curl -s "$GATEWAY_URL/insights?site=$SITE")
if echo "$INSIGHTS_RESPONSE" | grep -q "site"; then
    echo "  ✓ Insights retrieved successfully"
else
    echo "  ✗ Insights retrieval failed: $INSIGHTS_RESPONSE"
    exit 1
fi

echo ""

# Test plans endpoint
echo "8. Testing plans retrieval..."
PLANS_RESPONSE=$(curl -s "$GATEWAY_URL/plans?site=$SITE")
if echo "$PLANS_RESPONSE" | grep -q "site"; then
    echo "  ✓ Plans retrieved successfully"
else
    echo "  ✗ Plans retrieval failed: $PLANS_RESPONSE"
    exit 1
fi

echo ""

# Test assistant
echo "9. Testing assistant..."
ASSISTANT_RESPONSE=$(curl -s -X POST "$ASSISTANT_URL/ask" \
    -H "Content-Type: application/json" \
    -d "{\"site\":\"$SITE\",\"q\":\"How many anomalies were detected?\"}")
if echo "$ASSISTANT_RESPONSE" | grep -q "answer"; then
    echo "  ✓ Assistant responded successfully"
else
    echo "  ✗ Assistant failed: $ASSISTANT_RESPONSE"
    exit 1
fi

echo ""
echo "=========================================="
echo "All smoke tests passed! ✓"
echo "=========================================="

# Cleanup
rm -f /tmp/energy_sample.csv

