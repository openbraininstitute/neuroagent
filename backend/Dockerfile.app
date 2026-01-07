FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update && \
    apt-get -y install curl \
    ca-certificates \
    nodejs \
    npm && \
    rm -rf /var/lib/apt/lists/*

# Install uv using the official installer script
# The installer will detect the container's architecture automatically
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    chmod +x /root/.local/bin/uv && \
    /root/.local/bin/uv --version
ENV PATH="/root/.local/bin/:$PATH"

COPY ./ /code
WORKDIR /code

# Install dependencies using uv
RUN uv sync --extra app

# Keep the code directory for uv to work properly
# The .venv will be in /code/.venv
WORKDIR /code

EXPOSE 8078
ENTRYPOINT ["bash", "-c", "uv run alembic upgrade head && uv run uvicorn neuroagent.app.main:app --host 0.0.0.0 --port 8078"]
