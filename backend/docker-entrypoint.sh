#!/bin/bash

set -o errexit

alembic upgrade head
neuroagent-api --host 0.0.0.0 --port 8078
