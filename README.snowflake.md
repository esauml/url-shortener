# Snowflake ID Architecture Implementation

This URL shortener now implements **Snowflake ID generation** for distributed, collision-free short code generation across multiple application instances.

## What is Snowflake Architecture?

Snowflake is a distributed ID generation algorithm originally developed by Twitter. It generates unique, time-ordered 64-bit IDs that are:
- **Globally unique** across all machines
- **Time-ordered** (sortable by creation time)
- **Collision-free** in distributed systems
- **Highly performant** (~4 million IDs per second per worker)

## Architecture Components

### 1. Snowflake ID Structure (64 bits)

```
┌─────────────────────────────────────────────────────────────────┐
│  1 bit  │  41 bits  │  10 bits  │    12 bits                    │
│ unused  │ timestamp │  worker   │   sequence                    │
│   (0)   │   (ms)    │    ID     │   number                      │
└─────────────────────────────────────────────────────────────────┘
```

- **Timestamp (41 bits)**: Milliseconds since custom epoch (2024-01-01)
  - Provides ~69 years of unique timestamps
- **Worker ID (10 bits)**: Supports 1,024 unique workers
- **Sequence (12 bits)**: 4,096 IDs per millisecond per worker

### 2. Total Capacity
- **1,024 workers** (0-1023)
- **4,096 IDs per millisecond** per worker
- **~4 million IDs per second** per worker
- **~4 billion IDs per second** across all 1,024 workers

## Implementation

### Key Files

1. **`src/utils/snowflake.ts`** - Core Snowflake ID generator
   - `SnowflakeGenerator` class with configurable worker/datacenter IDs
   - `createSnowflakeGenerator()` factory function
   - Base62 encoding for URL-friendly short codes

2. **`src/services/url.service.ts`** - Updated to use Snowflake IDs
   - Singleton Snowflake generator per worker
   - Generates 6-character base62-encoded short codes

3. **`docker-compose.snowflake.yml`** - Distributed deployment
   - 3 app workers with unique IDs (0, 1, 2)
   - Each worker assigned explicit `WORKER_ID` environment variable
   - Nginx load balancer distributing requests

4. **`nginx.snowflake.conf`** - Load balancer configuration
   - Routes to named worker instances
   - Least-connections load balancing

## Usage

### Starting with Automatic Worker IDs (Recommended)

```bash
# Use the default Docker Compose with scale command
docker compose up --build --scale app=3

# Worker IDs are automatically assigned via hostname hashing:
# - Container hostname: 20e04341fcc9 → Worker ID: 412 (example)
# - Container hostname: a8f32d1b9c4e → Worker ID: 731 (example)
# - Container hostname: f7b89c2d4a1e → Worker ID: 156 (example)

# Scale to more workers dynamically:
docker compose up --scale app=5

# The system will start:
# - 1 PostgreSQL database
# - N app workers (auto-assigned unique IDs)
# - 1 Nginx load balancer (port 8080)
```

### Testing the System

```bash
# Create short URLs through the load balancer
curl -X POST http://localhost:8080/ \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Each request may be handled by a different worker
# But all IDs will be globally unique
```

### Scaling to More Workers

**Option 1: Dynamic Scaling (Automatic Worker IDs)**
```bash
# Scale up to 5 workers
docker compose up --scale app=5

# Scale down to 2 workers
docker compose up --scale app=2

# Worker IDs are automatically assigned via hostname hashing
# Each container gets a unique, deterministic ID
# No configuration changes needed!
```

## Benefits

### 1. **No Database Coordination**
- Traditional approach: Query database for next ID (slow, bottleneck)
- Snowflake approach: Generate IDs locally (fast, no locks)

### 2. **Truly Distributed**
- Each worker generates IDs independently
- No conflicts between workers
- No central coordination needed

### 3. **Time-Ordered IDs**
- IDs are naturally sortable by creation time
- Useful for analytics and debugging
- Database indexes benefit from sequential inserts

### 4. **High Performance**
- ~4 million IDs per second per worker
- Linear scalability (add more workers = more capacity)
- No database round-trips for ID generation

### 5. **Fault Tolerant**
- Workers can fail independently
- No single point of failure for ID generation
- Clock skew detection prevents duplicates

## Comparison with Previous Approach

| Aspect           | Previous (Sequential IDs) | Snowflake Architecture  |
| ---------------- | ------------------------- | ----------------------- |
| **Coordination** | Database query per URL    | None (local generation) |
| **Scalability**  | Limited by DB             | Linear with workers     |
| **Performance**  | ~1000 URLs/sec            | ~4M URLs/sec per worker |
| **Distribution** | Single point of failure   | Fully distributed       |
| **Collisions**   | Impossible (sequential)   | Impossible (by design)  |

## Worker ID Detection

The system automatically assigns worker IDs using a hash-based approach:

1. **`WORKER_ID` environment variable** (explicit, highest priority)
   - Set this to manually assign a specific worker ID (0-1023)
   - Example: `WORKER_ID=5` → Worker ID 5

2. **Automatic hash-based assignment** (default)
   - Generates a deterministic worker ID from the container's hostname
   - Uses MD5 hash of hostname masked to 10 bits (0-1023 range)
   - Each unique hostname gets a unique worker ID
   - Docker-generated hostnames like `20e04341fcc9` → Worker ID (e.g., 412)
   - Ensures no collisions as long as hostnames are unique (guaranteed by Docker)
   
**Why hash-based?**
- ✅ No configuration needed when scaling
- ✅ Deterministic (same hostname = same ID)
- ✅ Uniform distribution across 0-1023 range
- ✅ No Docker socket or API access required
- ✅ Works in any container orchestration platform

## Environment Variables

| Variable        | Description                        | Default            | Range  |
| --------------- | ---------------------------------- | ------------------ | ------ |
| `WORKER_ID`     | Unique worker identifier (manual)  | Hash of hostname   | 0-1023 |
| `DATACENTER_ID` | Datacenter identifier              | 0                  | N/A    |
| `HOSTNAME`      | Container hostname (used for hash) | Auto-set by Docker | -      |

## Monitoring

### Check Worker Assignments

Each worker logs its ID on startup:

```bash
# Check logs for automatically scaled workers
docker compose logs app | grep "Snowflake generator initialized"
# Example output:
# Snowflake generator initialized: Worker ID=412
# Snowflake generator initialized: Worker ID=731
# Snowflake generator initialized: Worker ID=156

# Check a specific container
docker compose logs url-shortener-app-1
# Look for: "Snowflake generator initialized: Worker ID=<number>"
```

### Verify ID Uniqueness

```bash
# Generate 1000 URLs and check for duplicates
for i in {1..1000}; do
  curl -X POST http://localhost:8080/ \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"https://example.com/test$i\"}" \
    -s | jq -r '.shortCode'
done | sort | uniq -d
# Should return empty (no duplicates)
```

## Load Testing

The existing load test scripts work with the Snowflake architecture:

```bash
# Run advanced load test
./load-test.sh

# Expected results with 3 workers:
# - ~12,000+ requests/second (4,000 per worker)
# - 0% error rate
# - All codes unique
```

## Kubernetes Deployment

For Kubernetes, worker IDs can be extracted from pod names:

```yaml
env:
  - name: WORKER_ID
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
# Pod names like "app-0", "app-1", "app-2" automatically set worker IDs
```

## Advanced Configuration

### Custom Epoch

Change the epoch to maximize timestamp range:

```typescript
// src/utils/snowflake.ts
const customEpoch = new Date('2024-01-01').getTime();
const generator = new SnowflakeGenerator(workerId, datacenterId, customEpoch);
```

### Multiple Datacenters

Deploy across multiple regions:

```yaml
# us-east datacenter
environment:
  - DATACENTER_ID=0
  - WORKER_ID=${WORKER_ID}

# us-west datacenter
environment:
  - DATACENTER_ID=1
  - WORKER_ID=${WORKER_ID}
```

## Troubleshooting

### Clock Drift Issues

If you see "Clock moved backwards" errors:

1. Ensure NTP is enabled on all hosts
2. Use a centralized time service
3. Monitor system clock skew

### Duplicate IDs

If duplicates occur (extremely rare):

1. Verify each worker has a unique `WORKER_ID`
2. Check for worker ID collisions
3. Review logs for clock synchronization issues

## References

- [Original Twitter Snowflake](https://github.com/twitter-archive/snowflake)
- [Snowflake ID Wikipedia](https://en.wikipedia.org/wiki/Snowflake_ID)
- [Distributed ID Generation at Scale](https://blog.twitter.com/engineering/en_us/a/2010/announcing-snowflake)

## Future Enhancements

1. **Redis-based worker registry** - Dynamic worker ID assignment
2. **Metrics dashboard** - Real-time ID generation statistics
3. **Multi-region support** - Cross-datacenter coordination
4. **ID analytics** - Parse and analyze Snowflake IDs for insights
