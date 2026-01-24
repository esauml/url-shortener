# Load Testing Setup for URL Shortener

## Architecture

The setup includes:
- **3 app server replicas** running your Node.js application
- **Nginx load balancer** distributing requests across replicas
- **PostgreSQL database** shared by all replicas
- **Load testing scripts** to simulate traffic

## Quick Start

### 1. Start Multiple Replicas (Default: 3)

```bash
docker-compose up --build
```

The service will be available at `http://localhost:8080` (nginx load balancer).

### 2. Scale to Different Number of Replicas

```bash
# Scale to 5 replicas
docker-compose up --scale app=5

# Or use the pre-configured scale file
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up
```

### 3. Run Load Tests

**Basic load test (using curl):**
```bash
./load-test.sh 1000 10
# Args: [total_requests] [concurrency]
```

**Advanced load test (using ab or wrk):**
```bash
./load-test-advanced.sh
# Requires: Apache Bench (ab) or wrk
# Install: brew install wrk (macOS)
```

## Load Balancing Strategy

Nginx uses **least_conn** algorithm, distributing requests to the server with the fewest active connections.

## Monitoring

**Check running containers:**
```bash
docker-compose ps
```

**View logs from all replicas:**
```bash
docker-compose logs -f app
```

**Check nginx logs:**
```bash
docker-compose logs -f nginx
```

**Monitor resource usage:**
```bash
docker stats
```

## Load Testing Tips

1. **Warm up** - Run small tests first to warm up the system
2. **Gradual increase** - Start with low concurrency and increase gradually
3. **Monitor resources** - Watch CPU/memory usage with `docker stats`
4. **Database connections** - Ensure your connection pool can handle concurrent requests

## Endpoints to Test

- `GET /health` - Health check (lightweight)
- `POST /shorten` - Create shortened URL (database write)
- `GET /:code` - Retrieve URL (database read)

## Example Load Test Results

Expected performance (depends on your hardware):
- Health endpoint: 5,000-10,000 req/s
- Create URL: 500-2,000 req/s
- Retrieve URL: 1,000-3,000 req/s

## Cleanup

```bash
docker-compose down -v
```
