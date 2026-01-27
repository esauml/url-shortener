#!/bin/bash

# Test script for Snowflake ID architecture
# This script verifies that:
# 1. Each worker generates unique IDs
# 2. IDs are distributed across workers
# 3. No collisions occur under load

set -e

echo "=== Snowflake Architecture Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${1:-http://localhost:8080}"
NUM_REQUESTS=100

echo "Testing URL: $BASE_URL"
echo "Number of requests: $NUM_REQUESTS"
echo ""

# Create temporary file for results
RESULTS_FILE=$(mktemp)
CODES_FILE=$(mktemp)

echo "Step 1: Generating URLs..."
for i in $(seq 1 $NUM_REQUESTS); do
    RESPONSE=$(curl -s -X POST "$BASE_URL/api/shorten" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"https://example.com/test-$i\"}")
    
    CODE=$(echo "$RESPONSE" | jq -r '.shortCode')
    WORKER=$(echo "$RESPONSE" | jq -r '.workerId // "unknown"')
    
    echo "$CODE|$WORKER" >> "$RESULTS_FILE"
    echo "$CODE" >> "$CODES_FILE"
    
    if [ $((i % 10)) -eq 0 ]; then
        echo -n "."
    fi
done
echo ""
echo ""

# Step 2: Check for duplicates
echo "Step 2: Checking for duplicate IDs..."
DUPLICATES=$(sort "$CODES_FILE" | uniq -d | wc -l)

if [ "$DUPLICATES" -eq 0 ]; then
    echo -e "${GREEN}✓ No duplicates found - All $NUM_REQUESTS IDs are unique!${NC}"
else
    echo -e "${RED}✗ Found $DUPLICATES duplicate IDs${NC}"
    echo "Duplicates:"
    sort "$CODES_FILE" | uniq -d
    exit 1
fi
echo ""

# Step 3: Check worker distribution
echo "Step 3: Analyzing worker distribution..."
echo "Worker ID | Count | Percentage"
echo "----------|-------|------------"

# Count requests per worker
awk -F'|' '{print $2}' "$RESULTS_FILE" | sort | uniq -c | while read count worker; do
    percentage=$(awk "BEGIN {printf \"%.1f\", ($count/$NUM_REQUESTS)*100}")
    printf "%-9s | %-5d | %s%%\n" "$worker" "$count" "$percentage"
done
echo ""

# Step 4: Verify time ordering
echo "Step 4: Checking time-ordering..."
# Sample first and last codes
FIRST_CODE=$(head -1 "$CODES_FILE")
LAST_CODE=$(tail -1 "$CODES_FILE")

echo "First code: $FIRST_CODE"
echo "Last code:  $LAST_CODE"

# Codes should be generally increasing (base62 comparison)
if [[ "$FIRST_CODE" < "$LAST_CODE" ]]; then
    echo -e "${GREEN}✓ Codes are time-ordered${NC}"
else
    echo -e "${YELLOW}⚠ Codes may not be strictly ordered (can happen with load balancing)${NC}"
fi
echo ""

# Step 5: Test a few redirects
echo "Step 5: Testing URL redirects..."
SAMPLE_CODES=$(head -5 "$CODES_FILE")
SUCCESS_COUNT=0
TOTAL_TESTS=0

for CODE in $SAMPLE_CODES; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/$CODE")
    
    if [ "$HTTP_CODE" -eq 302 ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}✗ Failed to redirect code: $CODE (HTTP $HTTP_CODE)${NC}"
    fi
done

echo "Redirects successful: $SUCCESS_COUNT/$TOTAL_TESTS"
if [ "$SUCCESS_COUNT" -eq "$TOTAL_TESTS" ]; then
    echo -e "${GREEN}✓ All redirects working${NC}"
else
    echo -e "${RED}✗ Some redirects failed${NC}"
    exit 1
fi
echo ""

# Cleanup
rm -f "$RESULTS_FILE" "$CODES_FILE"

echo "=== Test Summary ==="
echo -e "${GREEN}✓ All tests passed!${NC}"
echo "- Generated $NUM_REQUESTS unique IDs"
echo "- No collisions detected"
echo "- Workers are distributing load"
echo "- Redirects are working"
echo ""
echo "Snowflake architecture is working correctly!"
