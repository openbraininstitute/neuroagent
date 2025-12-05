FROM python:3.11

ENV PYTHONUNBUFFERED=1

RUN apt-get -y update && \
    apt-get -y install curl \
    ca-certificates && \
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

# Move alembic files and entrypoint script
RUN mv /code/alembic /alembic && \
    mv /code/alembic.ini /alembic.ini && \
    mv /code/docker-entrypoint.sh /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Keep the code directory for uv to work properly
# The .venv will be in /code/.venv
WORKDIR /code

EXPOSE 8078
ENTRYPOINT ["/docker-entrypoint.sh"]
