# TaskAPI

A scalable REST API with JWT authentication and role-based access control, built with FastAPI and SQLAlchemy. Includes a lightweight vanilla JS frontend for testing all endpoints in the browser.

## Stack

- **FastAPI** — API framework with auto-generated Swagger docs
- **SQLAlchemy** — ORM (SQLite for dev, Postgres for prod)
- **Pydantic v2** — request validation and response schemas
- **passlib[bcrypt]** — password hashing
- **PyJWT** — JWT token generation and verification

## Requirements

- Python 3.11+

## Setup

Clone the repo:

```
git clone <your-repo-url>
cd taskapi
```

Copy the env file:

```
cp .env.example .env
```

Install dependencies:

```
make install
```

Or without make:

```
pip install -r requirements.txt
```

## Running

```
make run
```

Or without make:

```
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Open:

- Frontend UI → http://localhost:8000
- Swagger docs → http://localhost:8000/api/docs
- ReDoc → http://localhost:8000/api/redoc

## API Overview

### Auth `/api/v1/auth`

| Method | Path        | Description     | Auth |
|--------|-------------|-----------------|------|
| POST   | `/register` | create account  | no   |
| POST   | `/login`    | get JWT token   | no   |

### Tasks `/api/v1/tasks`

| Method | Path    | Description    | Auth |
|--------|---------|----------------|------|
| GET    | `/`     | list my tasks  | yes  |
| POST   | `/`     | create task    | yes  |
| GET    | `/{id}` | get one task   | yes  |
| PATCH  | `/{id}` | update task    | yes  |
| DELETE | `/{id}` | delete task    | yes  |

### Users `/api/v1/users`

| Method | Path                  | Description     | Auth |
|--------|-----------------------|-----------------|------|
| GET    | `/me`                 | my profile      | yes  |
| POST   | `/me/change-password` | change password | yes  |

### Admin `/api/v1/admin`

| Method | Path                     | Description       | Auth       |
|--------|--------------------------|-------------------|------------|
| GET    | `/users`                 | list all users    | admin only |
| PATCH  | `/users/{id}/deactivate` | deactivate user   | admin only |
| PATCH  | `/users/{id}/promote`    | promote to admin  | admin only |
| GET    | `/tasks`                 | list all tasks    | admin only |

## Database

SQLite by default. To switch to Postgres update `.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/taskapi
```

Tables are created automatically on startup.

## Tests

```
make test
```

Or:

```
pytest tests/ -v
```

## Scalability

See `SCALABILITY.md`.
