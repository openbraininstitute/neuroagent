# Backend

## Installation
```bash
pip install -e .
```

## Running Locally

1. Set up environment:
   - Copy `.env.example` to `.env` and fill in required variables
   - Set up database (SQLite or PostgreSQL)

2. Initialize SQLite database (if using SQLite):
```bash
touch sqlite.db
alembic -x url=sqlite:///sqlite.db upgrade head
```

3. Start the server:
```bash
neuroagent-api
```

The API will be available at `http://localhost:8000`
