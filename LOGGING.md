# Structured Logging Guide

This application uses **Pino** for structured JSON logging with request-scoped context, automatic request ID generation, and sensitive data redaction.

## Log Levels

| Level     | Use Case                                         | Example                                       |
| --------- | ------------------------------------------------ | --------------------------------------------- |
| **trace** | Detailed diagnostics (disabled in production)    | Internal function calls                       |
| **debug** | Development information (default in development) | Cache operations, external calls              |
| **info**  | General informational messages                   | Request completion, server startup            |
| **warn**  | Warning messages that don't prevent operation    | Deprecated feature usage, validation failures |
| **error** | Error conditions requiring attention             | Request failures, database errors             |
| **fatal** | Critical errors requiring immediate action       | Service initialization failures               |

## Configuration

Set these environment variables to configure logging:

```bash
# Log level (trace, debug, info, warn, error, fatal)
# Default: 'debug' in development, 'info' in production
LOG_LEVEL=debug

# Enable pretty printing for logs (recommended for development)
# Default: true in development, false in production
LOG_PRETTY=true
```

## Log Output Format

### Development (Pretty Printed)
```
18:45:32 info  Generated short URL
    code: abc123
    url: https://example.com/very/long/url
    workerId: 1
    requestId: 550e8400-e29b-41d4-a716-446655440000
```

### Production (Structured JSON)
```json
{
  "level": "info",
  "time": "2026-02-01T18:45:32.123Z",
  "msg": "Generated short URL",
  "code": "abc123",
  "url": "https://example.com/very/long/url",
  "workerId": 1,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "env": "production"
}
```

## Request Logging

Every HTTP request is automatically logged by the `pino-http` middleware:

```json
{
  "level": "info",
  "time": "2026-02-01T18:45:32.123Z",
  "msg": "POST /shorten - 201",
  "request": {
    "method": "POST",
    "url": "/shorten",
    "path": "/shorten",
    "query": {},
    "params": {}
  },
  "response": {
    "statusCode": 201
  },
  "responseTime": 42,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Logging in Controllers

Use the `req.log` property attached by the request logger middleware:

```typescript
// Simple info log
req.log.info({ code, url }, 'Generated short URL');

// Error log with context
req.log.error({ err: error, code }, 'Failed to generate short URL');

// Debug for detailed diagnostics
req.log.debug({ cacheHit: true, ttl: 3600 }, 'Cache lookup');

// Warn for non-critical issues
req.log.warn({ deprecated: 'oldEndpoint' }, 'Using deprecated endpoint');
```

## Logging in Services

Services receive a child logger instance in their constructor:

```typescript
class CacheService {
  constructor(private redis: Redis, private logger: Logger) {}

  async get(key: string): Promise<Data | null> {
    try {
      const value = await this.redis.get(key);
      this.logger.debug({ key, hit: !!value }, 'Cache lookup');
      return value ? JSON.parse(value) : null;
    } catch (error) {
      this.logger.error({ err: error, key }, 'Cache read failed');
      return null; // Resilient to cache failures
    }
  }
}
```

## Error Logging

Use the `logError` helper for consistent error logging with structured context:

```typescript
import { logError } from '@/utils/loggerHelpers';

// In error handlers
logError(req.log, error, {
  category: 'user', // 'user' | 'system' | 'external'
  code: 'INVALID_INPUT',
  statusCode: 400,
  message: 'The provided input is invalid',
  context: { field: 'email', value: userInput.email },
});
```

Error categories:
- **user**: Client errors (validation, bad input, not found) - expected errors
- **system**: Server errors (database failures, timeouts) - unexpected but internal
- **external**: Third-party service failures (API errors, network issues)

## Special Logging Patterns

### Performance Timing

```typescript
import { logRequestStart } from '@/utils/loggerHelpers';

const stopTimer = logRequestStart(req.log, 'URL Shortening');
try {
  const result = await urlService.createShortUrl(url);
  stopTimer(201); // Log with status code
} catch (err) {
  stopTimer(500);
  throw err;
}
```

Output:
```json
{
  "level": "info",
  "operation": "URL Shortening",
  "duration": 45,
  "statusCode": 201,
  "msg": "URL Shortening completed in 45ms"
}
```

### Cache Operations

```typescript
import { logCacheOperation } from '@/utils/loggerHelpers';

logCacheOperation(logger, 'urlCache', 'get', true, { key: 'url:abc123' });
// Output: Cache get - HIT
```

### Validation Errors

```typescript
import { logValidationErrors } from '@/utils/loggerHelpers';

logValidationErrors(req.log, zodError.issues, 'URL validation');
```

### External Service Calls

```typescript
import { logExternalCall } from '@/utils/loggerHelpers';

logExternalCall(logger, 'RedisCache', 'set', { 
  key: 'url:abc123',
  ttl: 3600 
});
```

## Sensitive Data Redaction

The following fields are automatically redacted in logs:

- `url`, `originalUrl` - Full URLs may contain sensitive information
- `headers.authorization` - Auth tokens
- `headers.cookie` - Session cookies
- `password`, `token`, `secret`, `apiKey` - Credentials
- `accessToken`, `refreshToken` - OAuth tokens

Redacted fields appear as `[REDACTED]` in logs:

```json
{
  "url": "[REDACTED]",
  "headers": {
    "authorization": "[REDACTED]"
  }
}
```

### Adding Custom Redaction

To redact additional fields, update `src/logger.ts`:

```typescript
redact: {
  paths: [
    'url',
    'ssn',  // Add custom field
    'customSensitiveField',
  ],
  censor: '[REDACTED]',
},
```

## Child Loggers for Components

Create child loggers with component context for better tracing:

```typescript
// In container.ts
const cacheLogger = logger.child({ component: 'CacheService' });
const cacheService = new CacheService(redis, cacheLogger);

// Logs will include: { component: 'CacheService' }
```

## Structured Error Fields

Prisma errors are automatically flattened for better searchability:

```json
{
  "level": "error",
  "err": {
    "type": "PrismaClientKnownRequestError",
    "code": "P2025",
    "message": "An operation failed because it depends on one or more records that were required but not found.",
    "meta": {
      "modelName": "ShortUrl"
    }
  },
  "errorCode": "PRISMA_P2025",
  "errorCategory": "system",
  "statusCode": 404
}
```

## Best Practices

✅ **Do:**
- Use structured fields instead of string interpolation
- Include relevant context (IDs, types, counts)
- Log at the appropriate level
- Use child loggers for request-scoped logging
- Log errors with full error objects

❌ **Don't:**
- Log sensitive data (credentials, tokens, personal info)
- Ignore logging at critical operations
- Mix log levels (don't use info for errors)
- Log raw stack traces in production (use `err` field)
- Create individual loggers instead of using request logger

## Monitoring and Analysis

All logs in production are JSON-formatted for easy parsing by log aggregation services:

- **Datadog**: Parse with JSON parser
- **CloudWatch**: Use insights queries
- **Elasticsearch**: Index structured fields
- **Splunk**: Extract fields automatically

Use the `requestId` field to trace a single request through multiple services and logs.

Example query (Datadog):
```
env:production errorCode:* | stats count() by errorCode
```
