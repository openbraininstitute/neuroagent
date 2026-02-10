# Thumbnail Generation Environment Variable Fix

## Issue

The thumbnail generation tools were failing at runtime with the error:
```
TypeError: Cannot read properties of undefined (reading 'replace')
```

This occurred because the `thumbnailGenerationUrl` context variable was undefined, which then caused the S3 client configuration to fail with:
```
Error: Missing credentials in config, if using AWS_CONFIG_FILE, set AWS_SDK_LOAD_CONFIG=1
```

## Root Cause

The environment variable naming in `backend-ts/.env` did not match the Python backend's naming convention:

**Incorrect (old):**
- `NEUROAGENT_STORAGE__ENDPOINT` (should be `ENDPOINT_URL`)
- `NEUROAGENT_STORAGE__BUCKET` (should be `BUCKET_NAME`)
- `NEUROAGENT_STORAGE__EXPIRY` (should be `EXPIRES_IN`)

**Correct (Python backend convention):**
- `NEUROAGENT_STORAGE__ENDPOINT_URL`
- `NEUROAGENT_STORAGE__BUCKET_NAME`
- `NEUROAGENT_STORAGE__EXPIRES_IN`

## Solution

Updated the environment variable names in both `.env` and `.env.example` to match the Python backend's naming convention as defined in `backend/src/neuroagent/app/config.py`.

### Files Changed

1. **backend-ts/.env**
   - Changed `NEUROAGENT_STORAGE__ENDPOINT` → `NEUROAGENT_STORAGE__ENDPOINT_URL`
   - Changed `NEUROAGENT_STORAGE__BUCKET` → `NEUROAGENT_STORAGE__BUCKET_NAME`
   - Changed `NEUROAGENT_STORAGE__EXPIRY` → `NEUROAGENT_STORAGE__EXPIRES_IN`

2. **backend-ts/.env.example**
   - Applied the same changes for consistency

### Configuration Mapping

The TypeScript `settings.ts` already had the correct field names matching Python:

```typescript
const SettingsStorageSchema = z.object({
  endpointUrl: z.string().optional(),      // NEUROAGENT_STORAGE__ENDPOINT_URL
  bucketName: z.string().default('neuroagent'), // NEUROAGENT_STORAGE__BUCKET_NAME
  accessKey: z.string().optional(),        // NEUROAGENT_STORAGE__ACCESS_KEY
  secretKey: z.string().optional(),        // NEUROAGENT_STORAGE__SECRET_KEY
  expiresIn: z.number().int().default(600), // NEUROAGENT_STORAGE__EXPIRES_IN
});
```

## Verification

All tests pass:
```bash
npm test thumbnail-generation-tools.test.ts --run
# ✓ 11 tests passed
```

## Context Variables

The thumbnail generation tools require these context variables (set in `route.ts`):
- `thumbnailGenerationUrl` - URL of the thumbnail generation service
- `s3Client` - Configured S3 client instance
- `bucketName` - S3 bucket name for storing thumbnails

These are now correctly populated from the environment variables.

## Related Documentation

- Python config: `backend/src/neuroagent/app/config.py`
- TypeScript config: `backend-ts/src/lib/config/settings.ts`
- S3 client: `backend-ts/src/lib/storage/client.ts`
- Chat route: `backend-ts/src/app/api/qa/chat_streamed/[thread_id]/route.ts`
