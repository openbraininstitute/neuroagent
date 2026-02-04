# API Reference

Complete API documentation for the Neuroagent TypeScript backend.

## Table of Contents

1. [Authentication](#authentication)
2. [Chat & Q&A Endpoints](#chat--qa-endpoints)
3. [Thread Management](#thread-management)
4. [Tools](#tools)
5. [Storage](#storage)
6. [Health & Settings](#health--settings)
7. [Error Responses](#error-responses)
8. [Rate Limiting](#rate-limiting)

---

## Authentication

All protected endpoints require a valid JWT token from Keycloak.

### Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Validation

The backend validates JWT tokens against the configured Keycloak issuer.

**Environment Configuration:**
```bash
NEUROAGENT_KEYCLOAK__ISSUER=https://keycloak.example.com/realms/myrealm
```

### User Information Extraction

From the JWT token, the backend extracts:
- `sub` - User ID
- `email` - User email
- `groups` - User groups for authorization

---

## Chat & Q&A Endpoints

### Stream Chat Response

Stream an AI response for a user message in a thread.

**Endpoint:** `POST /api/qa/chat_streamed/[thread_id]`

**Authentication:** Required

**Request Body:**
```json
{
  "content": "What are the main brain regions involved in memory?",
  "model": "gpt-4"
}
```
