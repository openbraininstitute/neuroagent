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

3. (Optional) Set up MinIO for storage:
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server --console-address ":9001" /data
```
MinIO will be available at:
- API: `http://localhost:9000`
- Console: `http://localhost:9001`

You'll need to create the `neuroagent` bucket. You can either:
- Use the MinIO Console UI at `http://localhost:9001` (login with minioadmin/minioadmin)
- Or use the MinIO CLI:
```bash
docker exec <container_id> mc mb /data/neuroagent
```


Please don't forget to update the `.env` file with the MinIO credentials.
```bash
NEUROAGENT_STORAGE__ENDPOINT_URL=http://localhost:9000
NEUROAGENT_STORAGE__ACCESS_KEY=minioadmin
NEUROAGENT_STORAGE__SECRET_KEY=minioadmin
```

4. Start the server:
```bash
neuroagent-api
```

The API will be available at `http://localhost:8000`
