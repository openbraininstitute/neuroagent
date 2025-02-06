# Frontend

## Installation

```bash
# For production dependencies only
npm install --omit=dev

# For development (includes all dependencies)
npm install
```

## Running Locally

1. Create `.env.local` with required variables:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
SERVER_SIDE_BACKEND_URL=http://localhost:8000

# Request these from ML team:
KEYCLOAK_ID=...
KEYCLOAK_SECRET=...
KEYCLOAK_ISSUER=...
NEXTAUTH_SECRET=...

NEXTAUTH_URL=http://localhost:3000
```

2. Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:3000`

Note: Ensure backend is running at `http://localhost:8000` or update BACKEND_URL variables accordingly.
