# Docker Setup for URL Shortener

This project includes Docker configuration for both local development and production deployment.

## Prerequisites

- Docker Desktop installed on your machine
- Docker Compose (included with Docker Desktop)

## Local Development with Docker

### Starting the Application

```bash
# Build and start the development container
docker-compose up

# Or run in detached mode (background)
docker-compose up -d
```

The application will be available at `http://localhost:3000` with hot reloading enabled.

### Stopping the Application

```bash
# Stop containers
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Viewing Logs

```bash
# Follow logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f app
```

### Rebuilding After Changes

```bash
# Rebuild the container after dependency changes
docker-compose up --build

# Or rebuild without starting
docker-compose build
```

### Running Commands Inside Container

```bash
# Execute commands in running container
docker-compose exec app npm install <package-name>

# Access shell
docker-compose exec app sh
```

## Production Deployment

### Build Production Image

```bash
docker build --target production -t url-shortener:latest .
```

### Run Production Container

```bash
docker run -d \
  -p 3000:3000 \
  --name url-shortener-prod \
  url-shortener:latest
```

## Environment Variables

You can create a `.env` file for environment-specific configuration:

```env
PORT=3000
NODE_ENV=development
```

Then update `docker-compose.yml` to use it:

```yaml
env_file:
  - .env
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, modify the port mapping in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Maps host port 3001 to container port 3000
```

### Permission Issues on Linux

If you encounter permission issues with mounted volumes:

```bash
docker-compose exec app chown -R node:node /app
```

### Clear Everything and Start Fresh

```bash
docker-compose down -v
docker-compose up --build
```
