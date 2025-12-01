#!/bin/bash

set -o errexit

# Use uv run to execute commands in the virtual environment
cd /code
uv run alembic upgrade head
uv run neuroagent-api --host 0.0.0.0 --port 8078
