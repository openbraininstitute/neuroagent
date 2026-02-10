# Running the TypeScript Backend

## Quick Start

The TypeScript backend runs on port **8079** (configured in `package.json`).

### Development Mode

```bash
cd backend-ts
npm run dev
```

This starts the Next.js development server on `http://localhost:8079`.

### Production Mode

```bash
cd backend-ts
npm run build
npm start
```

## Port Configuration

The backend is configured to run on port **8079** to match the frontend's expectations:

- **Frontend expects**: `http://localhost:8079/api` (configured in `frontend/.env.local`)
- **Backend runs on**: `http://localhost:8079` (configured in `backend-ts/package.json`)

### Why Port 8079?

- Python backend runs on port **8078**
- TypeScript backend runs on port **8079**
- This allows both backends to run simultaneously for comparison/testing

## Verifying the Backend is Running

### 1. Check Health Endpoint

```bash
curl http://localhost:8079/api/healthz
```

Should return: `200 OK`

### 2. Check Root Endpoint

```bash
curl http://localhost:8079/api
```

Should return: `{"status":"ok"}`

### 3. Check Available Tools

```bash
curl http://localhost:8079/api/tools
```

Should return a list of available tools.

## Common Issues

### Port Already in Use

If you see `Error: listen EADDRINUSE: address already in use :::8079`:

1. Check if another process is using port 8079:
   ```bash
   lsof -i :8079
   ```

2. Kill the process:
   ```bash
   kill -9 <PID>
   ```

3. Or use a different port:
   ```bash
   npm run dev -- -p 8080
   ```

### Connection Refused

If the frontend shows `ERR_CONNECTION_REFUSED`:

1. **Backend not running**: Start the backend with `npm run dev`
2. **Wrong port**: Verify backend is on 8079 and frontend expects 8079
3. **Firewall**: Check if localhost connections are blocked

### Environment Variables Not Loaded

If you see errors about missing configuration:

1. Ensure `.env` file exists in `backend-ts/`
2. Check all required variables are set (see `.env.example`)
3. Restart the backend after changing `.env`

## Running Both Backends Simultaneously

You can run both Python and TypeScript backends at the same time:

```bash
# Terminal 1 - Python backend (port 8078)
cd backend
neuroagent-api

# Terminal 2 - TypeScript backend (port 8079)
cd backend-ts
npm run dev

# Terminal 3 - Frontend (port 3000)
cd frontend
npm run dev
```

Then switch between backends by changing `frontend/.env.local`:

```bash
# Use TypeScript backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8079/api

# Use Python backend
NEXT_PUBLIC_BACKEND_URL=http://localhost:8078/api
```

## Development Workflow

1. **Start the backend**:
   ```bash
   cd backend-ts
   npm run dev
   ```

2. **Start the frontend** (in another terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Open the app**: http://localhost:3000

4. **Make changes**: The backend will hot-reload automatically

## Logs and Debugging

### Enable Verbose Logging

Set environment variable:
```bash
NEUROAGENT_LOGGING__LEVEL=debug npm run dev
```

### View Request Logs

Next.js logs all requests to the console. Look for:
```
[streamChat] Starting chat stream for thread: ...
[streamChat] Tool execution: ...
```

### Check Database Queries

Enable Prisma query logging in `src/lib/db/client.ts`:
```typescript
new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})
```

## Production Deployment

See `docs/DEPLOYMENT.md` for production deployment instructions.

## Related Documentation

- `docs/DOCKER.md` - Running with Docker
- `docs/CONFIGURATION-GUIDE.md` - Environment configuration
- `docs/API-REFERENCE.md` - API endpoints documentation
