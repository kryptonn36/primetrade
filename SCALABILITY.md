# Scalability Notes

## Current architecture

Single-process FastAPI app with Postgresql. Fine for development and small deployments.
The structure is set up so none of the following changes require rewriting existing code.

## Database

Switch to Postgres by updating `DATABASE_URL` in `.env`. SQLAlchemy handles the rest.

For higher traffic, tune connection pooling in `database.py`:

```python
engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
```

Read replicas can be added by creating a second engine and a `get_read_db` dependency
for list/get endpoints.

## Caching

Add Redis for two quick wins:

- **Token blacklisting** — store revoked JWTs in Redis with a TTL matching the token's
  remaining lifetime. Right now logout is client-side only; Redis fixes this.
- **Response caching** — cache task list responses per user for a few seconds to cut DB
  load under burst traffic. `fastapi-cache2` integrates cleanly with the existing routes.

## Horizontal scaling

The app is stateless — JWT carries all session info. Multiple instances can run behind a
load balancer (nginx, AWS ALB) without sticky sessions. All instances must share the same
`SECRET_KEY` and point to the same Postgres instance.

## Microservices path

The project is already split by domain (`auth`, `tasks`, `users`, `admin`). If a domain
grows large enough to need independent scaling, each `app/api/v1/*.py` module can become
its own FastAPI service with its own database.

A sensible split when the time comes:

- **auth-service** — registration, login, token issuance
- **task-service** — task CRUD, owns the tasks table
- **user-service** — profiles, roles, admin actions
- **api-gateway** — nginx or a thin FastAPI proxy for routing and rate limiting

## Async

Current handlers use synchronous SQLAlchemy. For I/O-heavy workloads, swap to `asyncpg`
and `sqlalchemy[asyncio]` and mark handlers `async def`. FastAPI supports both without
route signature changes.

## Docker

A minimal `Dockerfile`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

For local dev with Postgres + Redis:

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports: ["8000:8000"]
    env_file: .env
    depends_on: [db, redis]
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: taskapi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
  redis:
    image: redis:7
```

For production: Kubernetes with horizontal pod autoscaling, Postgres on RDS,
Redis on ElastiCache.

## Logging

Add structured logging with `structlog` and ship to a collector (Loki, Datadog).
For distributed tracing across microservices, instrument with OpenTelemetry.
