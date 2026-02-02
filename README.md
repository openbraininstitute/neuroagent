# Neuroagent

LLM agent for interacting with neuroscience tools. Enables ChatGPT-style interactions to query brain regions, morphologies, electrical traces, and scientific literature.

1. [Running (Docker Compose)](#running-docker-compose)
2. [Funding and Acknowledgement](#funding-and-acknowledgement)

## Running (Docker Compose)
The easiest way to run the project is with Docker Compose:

1. Install Docker and Docker Compose
2. Create a `backend/.env` file with required variables. Configurable variables are listed in `backend/.env.example`. Please contact the Machine Learning team to get the secret values.
3. Create a `frontend/.env.local` file with required variables. Configure the following variables. Please contact the Machine Learning team to get the secret values.
```bash
KEYCLOAK_ID=
KEYCLOAK_SECRET=
KEYCLOAK_ISSUER=
NEXTAUTH_SECRET=
```

4. Start the services and initialize the database:
```bash
docker compose up
docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin && docker exec -it neuroagent-minio-1 mc mb myminio/neuroagent
```

5. Access the application at `http://localhost:3000`

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
