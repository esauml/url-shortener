#!/bin/bash

# Load Testing Script for URL Shortener
# Usage: ./load-test.sh [num_requests] [concurrency]

BASE_URL="${BASE_URL:-http://localhost:8080}"
NUM_REQUESTS="${1:-1000}"
CONCURRENCY="${2:-10}"

echo "🚀 Starting Load Test"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Target: $BASE_URL"
echo "Total Requests: $NUM_REQUESTS"
echo "Concurrency: $CONCURRENCY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if required tools are available
command -v curl >/dev/null 2>&1 || { echo "❌ curl is required but not installed."; exit 1; }

# Function to create shortened URL
create_url() {
    local id=$1
    curl -s -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -d "{\"url\":\"https://example.com/test-$id\"}" \
        -w "\nHTTP_STATUS:%{http_code}\n" 2>/dev/null
}

# Function to retrieve URL
get_url() {
    local short_code=$1
    curl -s -X GET "$BASE_URL/$short_code" \
        -w "\nHTTP_STATUS:%{http_code}\n" 2>/dev/null
}

# Warm up
echo ""
echo "🔥 Warming up..."
for i in {1..10}; do
    curl -s "$BASE_URL/health" > /dev/null
done

echo "✅ Warm up complete"
echo ""

# Test 1: Create URLs
echo "📝 Test 1: Creating URLs (POST /shorten)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

success_count=0
error_count=0
start_time=$(date +%s.%N)

for ((i=1; i<=NUM_REQUESTS; i++)); do
    (
        result=$(create_url $RANDOM)
        if echo "$result" | grep -q "HTTP_STATUS:20"; then
            echo "."
        else
            echo "E"
        fi
    ) &
    
    # Control concurrency
    if (( i % CONCURRENCY == 0 )); then
        wait
    fi
    
    # Progress indicator
    if (( i % 100 == 0 )); then
        echo -ne "\rProgress: $i/$NUM_REQUESTS"
    fi
done

wait
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
rps=$(echo "$NUM_REQUESTS / $duration" | bc -l)

echo ""
echo "✅ Create test complete"
echo "Duration: ${duration}s"
printf "Requests/sec: %.2f\n" $rps
echo ""

# Test 2: Health check endpoint
echo "❤️  Test 2: Health checks (GET /health)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

start_time=$(date +%s.%N)

for ((i=1; i<=500; i++)); do
    curl -s "$BASE_URL/health" > /dev/null &
    
    if (( i % CONCURRENCY == 0 )); then
        wait
    fi
done

wait
end_time=$(date +%s.%N)
duration=$(echo "$end_time - $start_time" | bc)
rps=$(echo "500 / $duration" | bc -l)

echo "✅ Health check test complete"
echo "Duration: ${duration}s"
printf "Requests/sec: %.2f\n" $rps
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Load Test Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
