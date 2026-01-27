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
│  1 bit  │  41 bits  │  5 bits  │  5 bits  │    12 bits         │
│ unused  │ timestamp │datacenter│  worker  │   sequence         │
│   (0)   │   (ms)    │    ID    │    ID    │   number           │
└─────────────────────────────────────────────────────────────────┘
```

- **Timestamp (41 bits)**: Milliseconds since custom epoch (2024-01-01)
  - Provides ~69 years of unique timestamps
- **Datacenter ID (5 bits)**: Supports 32 different datacenters
- **Worker ID (5 bits)**: Supports 32 workers per datacenter
- **Sequence (12 bits)**: 4,096 IDs per millisecond per worker

### 2. Total Capacity
- **1,024 machines** (32 datacenters × 32 workers)
- **4,096 IDs per millisecond** per machine
- **~4 million IDs per second** per machine
- **~4 billion IDs per second** across all 1,024 machines

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

### Starting the Snowflake Architecture

```bash
# Use the Snowflake-enabled Docker Compose configuration
docker-compose -f docker-compose.snowflake.yml up --build

# The system will start:
# - 1 PostgreSQL database
# - 3 app workers (IDs: 0, 1, 2)
# - 1 Nginx load balancer (port 8080)
```

### Testing the System

```bash
# Create short URLs through the load balancer
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Each request may be handled by a different worker
# But all IDs will be globally unique
```

### Scaling to More Workers

To add more workers, edit `docker-compose.snowflake.yml`:

```yaml
  app-worker-3:
    # ... same config as other workers ...
    environment:
      - WORKER_ID=3  # Unique ID (0-31)
      - DATACENTER_ID=0
    ports:
      - "3003:3000"
```

And update `nginx.snowflake.conf`:

```nginx
upstream app_servers {
    least_conn;
    server app-worker-0:3000 max_fails=3 fail_timeout=30s;
    server app-worker-1:3000 max_fails=3 fail_timeout=30s;
    server app-worker-2:3000 max_fails=3 fail_timeout=30s;
    server app-worker-3:3000 max_fails=3 fail_timeout=30s;
}
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

## Environment Variables

| Variable        | Description                    | Default       | Range     |
| --------------- | ------------------------------ | ------------- | --------- |
| `WORKER_ID`     | Unique worker identifier       | Auto-detected | 0-31      |
| `DATACENTER_ID` | Datacenter identifier          | 0             | 0-31      |
| `HOSTNAME`      | Auto-detected worker ID source | -             | -         |
| `PORT`          | Fallback for worker ID         | -             | 3000-3031 |

## Worker ID Auto-Detection

The system automatically determines worker IDs from:

1. **`WORKER_ID` environment variable** (highest priority)
2. **Hostname** (e.g., `app-worker-5` → worker ID 5)
3. **Port number** (e.g., port 3005 → worker ID 5)
4. **Default to 0** (for single-instance deployments)

## Monitoring

### Check Worker Assignments

Each worker logs its ID on startup:

```bash
docker-compose -f docker-compose.snowflake.yml logs app-worker-0
# Look for: "Snowflake generator initialized with worker ID: 0"
```

### Verify ID Uniqueness

```bash
# Generate 1000 URLs and check for duplicates
for i in {1..1000}; do
  curl -X POST http://localhost:8080/api/shorten \
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
./load-test-advanced.sh

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
