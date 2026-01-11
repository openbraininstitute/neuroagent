# Neuroagent

An intelligent LLM-powered agent for neuroscience research. Neuroagent provides ChatGPT-style conversational interface to query, analyze, and visualize neuroscience data including brain regions, cell morphologies, electrical recordings, connectivity metrics, and scientific literature.

## Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Quick Start with Docker Compose](#quick-start-with-docker-compose)
4. [Architecture](#architecture)
5. [Development Setup](#development-setup)
6. [Configuration](#configuration)
7. [API Documentation](#api-documentation)
8. [Contributing](#contributing)
9. [License](#license)
10. [Funding and Acknowledgement](#funding-and-acknowledgement)

## Features

- **Conversational Interface**: Natural language queries for neuroscience data
- **Multi-Domain Support**: Query brain regions, morphologies, electrical traces, ion channels, and more
- **Data Visualization**: Generate plots and visualizations using Python code execution
- **Scientific Literature Search**: Search and retrieve relevant neuroscience publications
- **Circuit Analysis**: Analyze neural circuit connectivity and population metrics
- **OBI Package Integration**: Access documentation and code examples for Open Brain Institute packages
- **User Authentication**: Secure access with Keycloak integration
- **Rate Limiting**: Built-in rate limiting for API protection
- **Persistent Storage**: MinIO-based object storage for data persistence

## Prerequisites

Before running Neuroagent, ensure you have:

- **Docker** (version 20.10 or later) and **Docker Compose** (version 2.0 or later)
- **OpenAI API Key**: Required for LLM functionality
- **Keycloak Credentials**: For authentication (request from the ML team)
- At least **4GB RAM** available for Docker containers
- **Port availability**: 3000 (frontend), 8078 (backend), 5432 (PostgreSQL), 9000/9001 (MinIO), 6379 (Redis)

## Quick Start with Docker Compose

The easiest way to run Neuroagent is with Docker Compose:

### 1. Clone the Repository

```bash
git clone https://github.com/openbraininstitute/neuroagent.git
cd neuroagent
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following required variables:

```bash
# Required: OpenAI API key for LLM functionality
OPENAI_API_KEY=your_openai_api_key

# Required: Keycloak authentication (request from ML team)
KEYCLOAK_ID=your_keycloak_client_id
KEYCLOAK_SECRET=your_keycloak_secret
KEYCLOAK_ISSUER=your_keycloak_issuer_url

# Required: NextAuth secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your_generated_secret
```

### 3. Start the Services

```bash
docker compose up
```

This will start all services:
- **Frontend**: Next.js application on port 3000
- **Backend**: FastAPI service on port 8078
- **PostgreSQL**: Database on port 5432
- **MinIO**: Object storage on ports 9000 (API) and 9001 (Console)
- **Redis**: Cache and rate limiter on port 6379

### 4. Initialize MinIO Storage

In a new terminal, create the required storage bucket:

```bash
docker exec -it neuroagent-minio-1 mc alias set myminio http://minio:9000 minioadmin minioadmin
docker exec -it neuroagent-minio-1 mc mb myminio/neuroagent
```

### 5. Access the Application

Open your browser and navigate to:
- **Application**: http://localhost:3000
- **API Documentation**: http://localhost:8078/docs
- **MinIO Console**: http://localhost:9001 (credentials: minioadmin/minioadmin)

### Useful Docker Commands

```bash
# Rebuild a specific service
docker compose build frontend
docker compose build backend

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v

# Reset only the database
docker volume rm neuroagent_postgres_data
```

## Architecture

Neuroagent consists of several components:

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Frontend  │─────▶│   Backend   │─────▶│  PostgreSQL  │
│  (Next.js)  │      │  (FastAPI)  │      │   Database   │
└─────────────┘      └─────────────┘      └──────────────┘
                           │
                           ├──────────────▶┌──────────────┐
                           │               │    MinIO     │
                           │               │   Storage    │
                           │               └──────────────┘
                           │
                           └──────────────▶┌──────────────┐
                                           │    Redis     │
                                           │Rate Limiter  │
                                           └──────────────┘
```

- **Frontend**: Next.js-based web interface with authentication
- **Backend**: FastAPI-based API server with LLM agent orchestration
- **PostgreSQL**: Relational database for user data and conversation history
- **MinIO**: S3-compatible object storage for file uploads and artifacts
- **Redis**: In-memory cache for rate limiting and session management

## Development Setup

For local development without Docker, see detailed setup instructions:

- **Backend**: [backend/README.md](backend/README.md)
- **Frontend**: [frontend/README.md](frontend/README.md)

### Quick Development Commands

```bash
# Backend development
cd backend
pip install -e .
neuroagent-api

# Frontend development
cd frontend
npm install
npm run dev
```

## Configuration

Neuroagent can be configured through environment variables. Key configuration options include:

### Backend Configuration

- `NEUROAGENT_OPENAI__TOKEN`: OpenAI API key (required)
- `NEUROAGENT_LLM__SUGGESTION_MODEL`: Model for suggestions (default: gpt-5-nano)
- `NEUROAGENT_LLM__TEMPERATURE`: LLM temperature setting
- `NEUROAGENT_AGENT__MAX_TURNS`: Maximum conversation turns
- `NEUROAGENT_RATE_LIMITER__LIMIT_CHAT`: Chat request limit (per 24h)
- `NEUROAGENT_RATE_LIMITER__DISABLED`: Disable rate limiting (default: false)

See [backend/.env.example](backend/.env.example) for all configuration options.

### Frontend Configuration

- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL for client-side requests
- `SERVER_SIDE_BACKEND_URL`: Backend API URL for server-side requests
- `KEYCLOAK_ID`, `KEYCLOAK_SECRET`, `KEYCLOAK_ISSUER`: Authentication credentials
- `NEXTAUTH_SECRET`: Secret for NextAuth.js session encryption

See [frontend/README.md](frontend/README.md) for more details.

## API Documentation

Once the backend is running, interactive API documentation is available at:

- **Swagger UI**: http://localhost:8078/docs
- **ReDoc**: http://localhost:8078/redoc

The API provides endpoints for:
- Chat conversations with the AI agent
- Query suggestions
- Conversation management
- File uploads and artifact retrieval
- Health checks and status

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (see [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md))
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Quality

- Backend uses **Ruff** for linting and formatting
- Frontend uses **ESLint** and **Prettier**
- Type checking with **MyPy** (backend) and **TypeScript** (frontend)
- Run `pre-commit install` to set up git hooks

## License

This project is licensed under the terms specified in [LICENSE.md](LICENSE.md).

## Funding and Acknowledgement

The development of this software was supported by funding to the Blue Brain Project, a research center of the École polytechnique fédérale de Lausanne (EPFL), from the Swiss government's ETH Board of the Swiss Federal Institutes of Technology.

Copyright &copy; 2024 Blue Brain Project/EPFL<br>
Copyright &copy; 2025 Open Brain Institute

## Support

For issues, questions, or feature requests, please:
- Open an issue on [GitHub Issues](https://github.com/openbraininstitute/neuroagent/issues)
- Check existing [documentation](backend/README.md) and [changelog](CHANGELOG.md)

---

**Note**: First-time setup may take several minutes to download and build Docker images. Subsequent starts will be much faster.
