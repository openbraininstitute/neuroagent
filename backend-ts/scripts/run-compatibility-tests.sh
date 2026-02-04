#!/bin/bash

# API Compatibility Test Runner
#
# This script runs the compatibility test suite against both Python and TypeScript backends.
# It ensures both backends are running and then executes the test suite.

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== API Compatibility Test Runner ===${NC}\n"

# Configuration
PYTHON_BACKEND_URL="${PYTHON_BACKEND_URL:-http://localhost:8078}"
TS_BACKEND_URL="${TS_BACKEND_URL:-http://localhost:3000}"
TEST_AUTH_TOKEN="${TEST_AUTH_TOKEN:-}"

# Check if backends are running
check_backend() {
    local url=$1
    local name=$2

    echo -e "Checking ${name} at ${url}..."

    if curl -s -f "${url}/healthz" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ ${name} is running${NC}"
        return 0
    else
        echo -e "${RED}✗ ${name} is not responding${NC}"
        return 1
    fi
}

# Check Python backend
if ! check_backend "$PYTHON_BACKEND_URL" "Python Backend"; then
    echo -e "\n${YELLOW}Python backend is not running. Start it with:${NC}"
    echo -e "  cd backend && neuroagent-api"
    echo -e "  or"
    echo -e "  docker compose up backend\n"
    exit 1
fi

# Check TypeScript backend
if ! check_backend "$TS_BACKEND_URL" "TypeScript Backend"; then
    echo -e "\n${YELLOW}TypeScript backend is not running. Start it with:${NC}"
    echo -e "  cd backend-ts && npm run dev"
    echo -e "  or"
    echo -e "  docker compose up backend-ts\n"
    exit 1
fi

echo -e "\n${GREEN}Both backends are running!${NC}\n"

# Check for auth token
if [ -z "$TEST_AUTH_TOKEN" ]; then
    echo -e "${YELLOW}Warning: TEST_AUTH_TOKEN is not set.${NC}"
    echo -e "Some tests may fail without a valid authentication token."
    echo -e "Set it with: export TEST_AUTH_TOKEN='your-token'\n"
fi

# Run the compatibility tests
echo -e "${GREEN}Running compatibility tests...${NC}\n"

cd "$(dirname "$0")/.."

PYTHON_BACKEND_URL="$PYTHON_BACKEND_URL" \
TS_BACKEND_URL="$TS_BACKEND_URL" \
TEST_AUTH_TOKEN="$TEST_AUTH_TOKEN" \
npm run test -- tests/api/compatibility.test.ts

echo -e "\n${GREEN}=== Compatibility tests completed ===${NC}\n"
