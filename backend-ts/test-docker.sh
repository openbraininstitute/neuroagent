#!/bin/bash
# Test script for Docker deployment of Neuroagent TypeScript Backend
# This script verifies that the Docker container is working correctly

set -e

echo "========================================="
echo "Docker Deployment Test Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

info() {
    echo -e "${YELLOW}ℹ INFO${NC}: $1"
}

# Test 1: Check if Docker is installed
echo "Test 1: Checking Docker installation..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    pass "Docker is installed: $DOCKER_VERSION"
else
    fail "Docker is not installed"
    exit 1
fi
echo ""

# Test 2: Check if Docker Compose is installed
echo "Test 2: Checking Docker Compose installation..."
if command -v docker compose &> /dev/null; then
    COMPOSE_VERSION=$(docker compose version)
    pass "Docker Compose is installed: $COMPOSE_VERSION"
else
    fail "Docker Compose is not installed"
    exit 1
fi
echo ""

# Test 3: Check if Dockerfile exists
echo "Test 3: Checking Dockerfile..."
if [ -f "Dockerfile" ]; then
    pass "Dockerfile exists"
else
    fail "Dockerfile not found"
    exit 1
fi
echo ""

# Test 4: Check if docker-entrypoint.sh exists
echo "Test 4: Checking docker-entrypoint.sh..."
if [ -f "docker-entrypoint.sh" ]; then
    pass "docker-entrypoint.sh exists"
    if [ -x "docker-entrypoint.sh" ]; then
        pass "docker-entrypoint.sh is executable"
    else
        fail "docker-entrypoint.sh is not executable"
    fi
else
    fail "docker-entrypoint.sh not found"
fi
echo ""

# Test 5: Check if .dockerignore exists
echo "Test 5: Checking .dockerignore..."
if [ -f ".dockerignore" ]; then
    pass ".dockerignore exists"
else
    info ".dockerignore not found (optional but recommended)"
fi
echo ""

# Test 6: Validate docker-compose.yml
echo "Test 6: Validating docker-compose.yml..."
cd ..
if docker compose config backend-ts > /dev/null 2>&1; then
    pass "docker-compose.yml is valid"
else
    fail "docker-compose.yml validation failed"
fi
cd backend-ts
echo ""

# Test 7: Build Docker image
echo "Test 7: Building Docker image..."
info "This may take a few minutes..."
if docker build -t neuroagent-backend-ts:test . > /tmp/docker-build.log 2>&1; then
    pass "Docker image built successfully"

    # Check image size
    IMAGE_SIZE=$(docker images neuroagent-backend-ts:test --format "{{.Size}}")
    info "Image size: $IMAGE_SIZE"

    # Warn if image is too large
    SIZE_MB=$(docker images neuroagent-backend-ts:test --format "{{.Size}}" | sed 's/MB//' | sed 's/GB/*1024/' | bc 2>/dev/null || echo "0")
    if [ -n "$SIZE_MB" ] && [ "$SIZE_MB" != "0" ]; then
        if (( $(echo "$SIZE_MB > 500" | bc -l) )); then
            info "Image size is larger than 500MB, consider optimization"
        fi
    fi
else
    fail "Docker image build failed"
    echo "Build log:"
    cat /tmp/docker-build.log
    exit 1
fi
echo ""

# Test 8: Inspect Docker image
echo "Test 8: Inspecting Docker image..."
if docker inspect neuroagent-backend-ts:test > /dev/null 2>&1; then
    pass "Docker image inspection successful"

    # Check exposed ports
    EXPOSED_PORT=$(docker inspect neuroagent-backend-ts:test --format='{{range $key, $value := .Config.ExposedPorts}}{{$key}}{{end}}' | grep -o '[0-9]*' | head -1)
    if [ "$EXPOSED_PORT" = "8079" ]; then
        pass "Correct port exposed: 8079"
    else
        fail "Wrong port exposed: $EXPOSED_PORT (expected 8079)"
    fi

    # Check user
    USER=$(docker inspect neuroagent-backend-ts:test --format='{{.Config.User}}')
    if [ "$USER" = "nextjs" ]; then
        pass "Running as non-root user: $USER"
    else
        info "User: $USER (expected: nextjs)"
    fi

    # Check entrypoint
    ENTRYPOINT=$(docker inspect neuroagent-backend-ts:test --format='{{.Config.Entrypoint}}')
    if [[ "$ENTRYPOINT" == *"dumb-init"* ]]; then
        pass "Using dumb-init for signal handling"
    else
        info "Entrypoint: $ENTRYPOINT"
    fi
else
    fail "Docker image inspection failed"
fi
echo ""

# Test 9: Check for security best practices
echo "Test 9: Checking security best practices..."

# Check if running as root
if docker inspect neuroagent-backend-ts:test --format='{{.Config.User}}' | grep -q "root\|^$"; then
    fail "Container runs as root (security risk)"
else
    pass "Container runs as non-root user"
fi

# Check for health check
if docker inspect neuroagent-backend-ts:test --format='{{.Config.Healthcheck}}' | grep -q "test"; then
    pass "Health check configured"
else
    info "No health check configured (recommended for production)"
fi
echo ""

# Test 10: Check multi-stage build
echo "Test 10: Checking multi-stage build..."
if grep -q "FROM.*AS deps" Dockerfile && grep -q "FROM.*AS builder" Dockerfile && grep -q "FROM.*AS runner" Dockerfile; then
    pass "Multi-stage build detected (optimized)"
else
    info "Multi-stage build not detected (consider for optimization)"
fi
echo ""

# Test 11: Check for Prisma files
echo "Test 11: Checking Prisma configuration..."
if [ -f "prisma/schema.prisma" ]; then
    pass "Prisma schema found"

    # Check if Prisma generate is in Dockerfile
    if grep -q "prisma generate" Dockerfile; then
        pass "Prisma client generation in Dockerfile"
    else
        fail "Prisma client generation missing from Dockerfile"
    fi
else
    fail "Prisma schema not found"
fi
echo ""

# Test 12: Check Next.js configuration
echo "Test 12: Checking Next.js configuration..."
if [ -f "next.config.ts" ]; then
    pass "Next.js config found"

    # Check for standalone output
    if grep -q "output.*standalone" next.config.ts; then
        pass "Standalone output configured (optimized for Docker)"
    else
        info "Standalone output not configured (recommended for Docker)"
    fi
else
    fail "Next.js config not found"
fi
echo ""

# Test 13: Check environment variables
echo "Test 13: Checking environment configuration..."
if [ -f ".env.example" ]; then
    pass ".env.example found"
else
    info ".env.example not found (recommended for documentation)"
fi
echo ""

# Test 14: Test container startup (if dependencies are available)
echo "Test 14: Testing container startup..."
info "Skipping container startup test (requires PostgreSQL, Redis, MinIO)"
info "To test startup, run: docker compose up -d backend-ts"
echo ""

# Summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Start services: docker compose up -d backend-ts"
    echo "2. Check logs: docker compose logs -f backend-ts"
    echo "3. Test health: curl http://localhost:8079/api/healthz"
    echo "4. View documentation: cat DOCKER.md"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo "Please fix the issues above before deploying"
    exit 1
fi
