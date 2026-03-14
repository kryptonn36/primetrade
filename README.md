# TaskAPI

A scalable REST API with JWT authentication and role-based access control, built with FastAPI and SQLAlchemy. Includes a lightweight vanilla JS frontend for testing all endpoints in the browser.

## Stack

- **FastAPI** — API framework with auto-generated Swagger docs
- **SQLAlchemy** — ORM (Postgres)
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

## API Overview

After login, send your token as `Authorization: Bearer <token>`.

- Auth (`/api/v1/auth`)
	- `POST /register` — create a new account
	- `POST /login` — get an access token

- Tasks (`/api/v1/tasks`) — login required
	- `GET /` — list your tasks
	- `POST /` — create a task
	- `GET /{id}` — get one of your tasks
	- `PATCH /{id}` — update a task
	- `DELETE /{id}` — delete a task

- Users (`/api/v1/users`) — login required
	- `GET /me` — view your profile
	- `POST /me/change-password` — change your password

- Admin (`/api/v1/admin`) — admin only
	- `GET /users` — list all users
	- `PATCH /users/{id}/deactivate` — deactivate a user
	- `PATCH /users/{id}/promote` — promote a user to admin
	- `GET /tasks` — list all tasks

### Admin bootstrap

In a fresh database, the **first registered account** is automatically assigned the `admin` role.
All subsequent registrations are assigned the `user` role by default.

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
