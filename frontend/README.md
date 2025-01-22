# Frontend

## Installation

To install only the production dependencies (recommended for non-developers), please run:

```bash
npm install --omit=dev
```

If you are a developer and want to install both regular and development dependencies, please run:

```bash
npm install
```

## Running locally

Please create a `.env.local` and define the following variables:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

Make sure your backend is running on `http://localhost:8000` or change the `NEXT_PUBLIC_BACKEND_URL` to the correct URL.

You can then run the frontend with the following command:

```bash
npm run dev
```
