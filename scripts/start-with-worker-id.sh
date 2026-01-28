#!/bin/sh

# Calculate Worker ID from hostname using MD5 hash
# Replicates the logic from src/utils/getWorkerId.ts in bash

HOSTNAME=$(hostname)

# Detect which MD5 tool is available (md5sum on Linux/Alpine, md5 on macOS)
if command -v md5sum >/dev/null 2>&1; then
    # Linux/Alpine: md5sum outputs "hash  -"
    MD5_HASH=$(echo -n "$HOSTNAME" | md5sum | cut -d' ' -f1)
elif command -v md5 >/dev/null 2>&1; then
    # macOS: md5 outputs "hash"
    MD5_HASH=$(echo -n "$HOSTNAME" | md5 -q)
else
    echo "Error: Neither md5sum nor md5 command found"
    exit 1
fi

# Extract first byte from hex hash (first 2 hex chars) and convert to decimal
FIRST_BYTE=$((0x${MD5_HASH:0:2}))

# Apply bitwise AND with 1023 (0b1111111111) to get 10-bit worker ID
WORKER_ID=$((FIRST_BYTE & 1023))

# Export worker ID for the application
export WORKER_ID

echo "Starting with WORKER_ID=$WORKER_ID (hostname: $HOSTNAME)"

# Execute npm command with all passed arguments
exec npm run "$@"
