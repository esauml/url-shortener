# URL Shortener

A distributed URL shortening service that converts long URLs into short, unique codes and redirects users. Built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma**, featuring scalable Snowflake ID generation to handle millions of requests without centralized coordination.

## Table of Contents

- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Architecture](#architecture)
- [Development](#development)
- [Logging](#logging)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Additional Resources](#additional-resources)

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+
- Docker (optional, for containerized setup)

### Local Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   # Create a .env file in the project root
   echo "DATABASE_URL=postgresql://user:password@localhost:5432/url_shortener" > .env
   echo "PORT=3000" >> .env
   echo "WORKER_ID=1" >> .env
   ```

3. **Initialize the database:**
   ```bash
   # Run migrations
   npx prisma migrate dev
   
   # (Optional) View the database visually
   npx prisma studio
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   The service will be available at `http://localhost:3000`

## API Documentation

### Health Check

Check if the service is running:

```bash
curl http://localhost:3000/health
```

**Response:** `200 OK`

### Create Short URL

Generate a short code for a long URL:

```bash
curl -X POST http://localhost:3000 \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/very/long/url/path"}'
```

**Request Body:**
```json
{
  "url": "https://example.com/very/long/url/path"
}
```

**Success Response (201):**
```json
{
  "code": "a1b2c3",
  "originalUrl": "https://example.com/very/long/url/path",
  "shortUrl": "http://localhost:3000/a1b2c3",
  "workerId": 1
}
```

**Error Responses:**
- `400 Bad Request` - Invalid URL format or missing URL field
- `409 Conflict` - URL already shortened (returns existing code)
- `500 Internal Server Error` - Database error

### Retrieve Original URL

Redirect to the original URL using the short code:

```bash
curl -L http://localhost:3000/a1b2c3
```

**Response:** HTTP 301 redirect to original URL

**Error Responses:**
- `404 Not Found` - Short code does not exist

## Architecture

### System Design

The service follows a **layered architecture** with clear separation of concerns:

```
HTTP Request
    ↓
[Express Server] (server.ts)
    ↓
[Express App] (app.ts) - Middleware, routes setup
    ↓
[URL Routes] (url.routes.ts) - POST /, GET /:code
    ↓
[URL Controller] (url.controller.ts) - Request validation, response formatting
    ↓
[URL Service] (url.service.ts) - Business logic, URL validation, ID generation
    ↓
[Snowflake ID Generator] (snowflake.ts) - Distributed ID generation
[URL Repository] (url.repository.ts) - Database operations
    ↓
[Prisma Client] - ORM layer
    ↓
[PostgreSQL Database]
```

### Key Components

**Server Layer** - Initializes Express server, listens on PORT, handles graceful shutdown

**Controller Layer** - Parses requests, calls service methods, formats responses, error handling

**Service Layer** - Validates URLs, generates short codes via Snowflake algorithm, orchestrates business logic

**Repository Layer** - Database operations (insert, fetch) via Prisma

**Snowflake ID Generation** - Distributed ID algorithm:
  - **64-bit ID structure:** Timestamp (41 bits) + Worker ID (10 bits) + Sequence (12 bits)
  - **Encoding:** Base62 conversion for URL-friendly 6-character codes
  - **Scalability:** Supports 1,024 workers, ~4 million IDs/second per worker
  - See [README.snowflake.md](README.snowflake.md) for detailed explanation

**Database Schema:**
```
urls {
  id: Int @id @default(autoincrement())
  code: String @unique
  originalUrl: String
  createdAt: DateTime
}
```

## Development

### Available npm Scripts

```bash
npm run dev       # Start development server with hot reload (ts-node-dev)
npm run build     # Compile TypeScript to JavaScript
npm run start     # Run compiled application
npm run lint      # Check code quality with ESLint
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. The development server auto-reloads on file changes
3. Check output in terminal for errors or logs
4. Test API endpoints using curl or Postman

### Database Migrations

After modifying `prisma/schema.prisma`:

```bash
# Create and apply a new migration
npx prisma migrate dev --name <description>

# View database with Prisma Studio
npx prisma studio
```

## Deployment

### Docker Deployment

Run the service in a container:

```bash
docker-compose up
```

This starts:
- PostgreSQL database (port 5432)
- URL Shortener app (port 3000)
- Nginx reverse proxy (port 80) - optional

For detailed Docker setup and production builds, see [README.docker.md](README.docker.md).

### Load Testing & Scaling

For multi-instance deployment with load balancing:

```bash
# Start 3 app replicas behind Nginx
docker-compose -f docker-compose.yml up

# Run load tests
bash load-test.sh
```

See [README.loadtest.md](README.loadtest.md) for performance benchmarks and scaling strategies.

## Logging

This service uses **Pino** for structured JSON logging with:
- Automatic request ID generation and tracing
- Request-scoped child loggers with context
- Sensitive data redaction (URLs, credentials, tokens)
- Configurable log levels and pretty printing for development
- Structured error logging with categorization

Key features:
- **Development**: Pretty-printed, colorized logs for easy reading
- **Production**: JSON-formatted logs for log aggregation services
- **Request Tracing**: All logs include `requestId` for correlating requests across components
- **Error Serialization**: Prisma and application errors are automatically flattened for searchability

For comprehensive logging documentation, examples, and best practices, see [LOGGING.md](LOGGING.md).

Quick setup:
```bash
# Development with pretty printing
NODE_ENV=development LOG_PRETTY=true npm run dev

# Production with JSON logging
NODE_ENV=production LOG_LEVEL=info npm start
```

### Environment Variables

```env
# Database
DATABASE_URL          # PostgreSQL connection string (required)

# Server
PORT                  # Server port (default: 3000)
NODE_ENV              # Environment: development, production, test (default: development)

# Distributed ID Generation
WORKER_ID             # Worker ID for Snowflake algorithm (0-1023, auto-derived if not set)
DATACENTER_ID         # Datacenter ID for Snowflake algorithm (default: 0)

# Logging Configuration
LOG_LEVEL             # Log level: trace, debug, info, warn, error, fatal
                      # Default: 'debug' in development, 'info' in production
LOG_PRETTY            # Enable pretty printing for logs (default: true in development, false in production)

# Redis Cache
REDIS_URL             # Redis connection string (default: redis://localhost:6379)
REDIS_TTL             # Cache TTL in seconds (default: 3600)
```

For detailed logging configuration, see [LOGGING.md](LOGGING.md).

## Deployment
DATABASE_URL          # PostgreSQL connection string (required)

# Server
PORT                  # Server port (default: 3000)
NODE_ENV              # Environment: development, production, test (default: development)

# Distributed ID Generation
WORKER_ID             # Worker ID for Snowflake algorithm (0-1023, auto-derived if not set)
DATACENTER_ID         # Datacenter ID for Snowflake algorithm (default: 0)

# Logging Configuration
LOG_LEVEL             # Log level: trace, debug, info, warn, error, fatal
                      # Default: 'debug' in development, 'info' in production
LOG_PRETTY            # Enable pretty printing for logs (default: true in development, false in production)

# Redis Cache
REDIS_URL             # Redis connection string (default: redis://localhost:6379)
REDIS_TTL             # Cache TTL in seconds (default: 3600)
```

For detailed logging configuration, see [LOGGING.md](LOGGING.md).

## Project Structure

```
.
├── src/
│   ├── app.ts                 # Express app configuration
│   ├── server.ts              # Server entry point
│   ├── controllers/
│   │   └── url.controller.ts  # Request handlers
│   ├── services/
│   │   └── url.service.ts     # Business logic
│   ├── repositories/
│   │   └── url.repository.ts  # Database queries
│   ├── routes/
│   │   └── url.routes.ts      # Route definitions
│   ├── utils/
│   │   ├── snowflake.ts       # Snowflake ID generator
│   │   ├── validateUrl.ts     # URL validation
│   │   └── getWorkerId.ts     # Worker ID detection
│   └── types/
│       └── url.ts             # TypeScript types
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── docker-compose.yml         # Multi-container setup
├── Dockerfile                 # Container image
├── nginx.conf                 # Load balancer config
├── package.json               # Dependencies
└── tsconfig.json              # TypeScript config
```

## Troubleshooting

**Issue: Database connection error**
- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Verify `DATABASE_URL` in `.env` is correct
- Run migrations: `npx prisma migrate dev`

**Issue: Port 3000 already in use**
- Change `PORT` in `.env` or environment
- Kill existing process: `lsof -ti:3000 | xargs kill -9`

**Issue: TypeScript compilation errors**
- Clear cache: `rm -rf dist/`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 20+)

**Issue: Snowflake ID collisions**
- Ensure each worker instance has a unique `WORKER_ID` (0-1023)
- Worker ID is detected from environment or hostname hash

**Issue: Prisma migration conflicts**
- Reset database (warning: deletes all data): `npx prisma migrate reset`
- Or manually sync: `npx prisma db push`

## Additional Resources

- **Docker Setup & Production Deployment** → [README.docker.md](README.docker.md)
- **Load Testing & Performance** → [README.loadtest.md](README.loadtest.md)
- **Snowflake Algorithm Details** → [README.snowflake.md](README.snowflake.md)
- **Prisma Documentation** → https://www.prisma.io/docs/
- **Express.js Documentation** → https://expressjs.com/

---

**Built with Node.js · Express · PostgreSQL · Prisma**
