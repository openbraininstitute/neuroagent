# Neuroagent

LLM agent for interacting with neuroscience tools. Enables ChatGPT-style interactions to query brain regions, morphologies, electrical traces, and scientific literature.

1. [Running (Docker Compose)](#running-docker-compose)
2. [Funding and Acknowledgement](#funding-and-acknowledgement)

## Running (Docker Compose)
The easiest way to run the project is with Docker Compose:

1. Install Docker and Docker Compose
2. Create `.env` file with required variables:
```bash
OPENAI_API_KEY=...
KEYCLOAK_ID=...
KEYCLOAK_SECRET=...
KEYCLOAK_ISSUER=...
NEXTAUTH_SECRET=...
```

3. Start the services and initialize the database:
```bash
docker compose up
docker exec -it neuroagent-backend-1 alembic -x url=postgresql://postgres:pwd@postgres:5432/neuroagent upgrade head
docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin && docker exec -it neuroagent-minio-1 mc mb myminio/neuroagent
docker cp brainregion_hierarchy.json neuroagent-minio-1:/tmp/brainregion_hierarchy.json && docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin && docker exec -it neuroagent-minio-1 mc cp /tmp/brainregion_hierarchy.json myminio/neuroagent/shared/brainregion_hierarchy.json
docker cp celltypes_hierarchy.json neuroagent-minio-1:/tmp/celltypes_hierarchy.json && docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin && docker exec -it neuroagent-minio-1 mc cp /tmp/celltypes_hierarchy.json myminio/neuroagent/shared/celltypes_hierarchy.json
```

4. Access the application at `http://localhost:3000`

Notes:
- First run will take longer to build frontend and backend images
- To rebuild individual services: `docker compose build frontend` or `docker compose build backend`
- Database changes persist in `neuroagent_postgres_data` volume
- MinIO data persists in `neuroagent_minio_data` volume
- Redis data persists in `neuroagent_redis_data` volume
- To reset database: `docker volume rm neuroagent_postgres_data`
- To stop all services: `docker compose down`

## Running (Frontend and Backend Separately)
See instructions in `frontend/README.md` and `backend/README.md`.

## Funding and Acknowledgement

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government's ETH Board of the Swiss Federal Institutes of Technology.

Copyright &copy; 2024 Blue Brain Project/EPFL<br>
Copyright &copy; 2025 Open Brain Institute
