#!/bin/bash

# Advanced Load Testing with Apache Bench (ab) or wrk
# This script provides more detailed metrics

BASE_URL="${BASE_URL:-http://localhost:8080}"
TOOL="${TOOL:-ab}"

echo "🚀 Advanced Load Testing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for available tools
if command -v ab >/dev/null 2>&1; then
    echo "Using Apache Bench (ab)"
    echo ""
    
    echo "Test 1: 10,000 requests, 100 concurrent"
    ab -n 10000 -c 100 -k "$BASE_URL/health"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    echo "Test 2: POST requests to create URLs"
    echo '{"url":"https://example.com/test"}' > /tmp/post_data.json
    ab -n 1000 -c 50 -p /tmp/post_data.json -T application/json "$BASE_URL/shorten"
    rm /tmp/post_data.json
    
elif command -v wrk >/dev/null 2>&1; then
    echo "Using wrk"
    echo ""
    
    echo "Test 1: 30 seconds, 10 threads, 100 connections"
    wrk -t10 -c100 -d30s "$BASE_URL/health"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    echo "Test 2: POST requests"
    wrk -t10 -c50 -d30s -s- "$BASE_URL/shorten" <<EOF
wrk.method = "POST"
wrk.body   = '{"url":"https://example.com/test"}'
wrk.headers["Content-Type"] = "application/json"
EOF
    
else
    echo "❌ Neither 'ab' (Apache Bench) nor 'wrk' is installed."
    echo ""
    echo "Install options:"
    echo "  macOS: brew install wrk"
    echo "  Ubuntu: sudo apt-get install apache2-utils"
    echo "  or use: ./load-test.sh for basic testing"
    exit 1
fi

echo ""
echo "🎉 Advanced Load Test Complete!"
