# Error Handling Fix for Streaming Responses

## Issue

When errors occurred during chat streaming, the client only received a generic error message:
```
3:"An error occurred."
```

Instead of the actual error details that would help with debugging.

## Root Cause

The `streamChat` method in `AgentsRoutine` was throwing errors in the catch block, which caused the Vercel AI SDK to return a generic error message. The error details were being logged to the console but not streamed back to the client.

## Solution

### 1. Added `getErrorMessage` Callback to `toDataStreamResponse()`

For errors that occur during streaming (after `streamText` is called), we added a `getErrorMessage` callback to properly format error messages:

```typescript
const response = result.toDataStreamResponse({
  getErrorMessage: (error: unknown) => {
    console.error('[streamChat] Error in stream:', error);

    if (error == null) {
      return 'Unknown error occurred';
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error instanceof Error) {
      // Return full error message with stack trace in development
      if (process.env.NODE_ENV === 'development') {
        return `${error.message}\n\nStack trace:\n${error.stack}`;
      }
      return error.message;
    }

    // For other error types, stringify them
    try {
      return JSON.stringify(error);
    } catch {
      return 'An error occurred while processing your request';
    }
  },
});
```

### 2. Manual Error Stream for Pre-Streaming Errors

For errors that occur before streaming starts (database errors, provider configuration errors, etc.), we create a manual error stream in the Vercel AI SDK format:

```typescript
catch (error) {
  // Determine error message
  let errorMessage: string;

  if (error == null) {
    errorMessage = 'An error occurred';
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    try {
      errorMessage = JSON.stringify(error);
    } catch {
      errorMessage = 'An error occurred';
    }
  }

  // Create error stream in Vercel AI SDK format
  const errorStream = new ReadableStream({
    start(controller) {
      // Format: 3:"error message"\n
      const errorPart = `3:${JSON.stringify(errorMessage)}\n`;
      controller.enqueue(new TextEncoder().encode(errorPart));
      controller.close();
    },
  });

  return new Response(errorStream, {
    status: 200, // Keep 200 to allow streaming
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  });
}
```

## Error Stream Format

According to Vercel AI SDK v4 documentation, error parts are formatted as:
```
3:"error message"\n
```

Where:
- `3:` indicates an error part
- The error message is JSON-encoded
- Ends with a newline character

## Error Types Handled

1. **Database Errors**: Connection failures, query errors
2. **Provider Configuration Errors**: Missing API keys, unconfigured providers
3. **String Errors**: When a string is thrown instead of an Error object
4. **Null/Undefined Errors**: Gracefully handled with generic message
5. **Object Errors**: Stringified for transmission
6. **Streaming Errors**: Errors during LLM streaming (tool errors, model errors, etc.)

## Development vs Production

- **Development Mode**: Includes full error messages with stack traces for debugging
- **Production Mode**: Returns only the error message without stack traces for security

## Testing

Created comprehensive test suite in `tests/agents/error-handling.test.ts`:

- ✅ Database errors return proper error streams
- ✅ Provider configuration errors return proper error streams
- ✅ String errors are handled correctly
- ✅ Null errors are handled correctly
- ✅ Object errors are stringified correctly
- ✅ Development mode includes detailed error information

All 7 tests pass successfully.

## Benefits

1. **Better Debugging**: Developers can see actual error messages in the client
2. **User Experience**: Users get meaningful error messages instead of generic ones
3. **Consistent Format**: All errors follow the Vercel AI SDK data stream format
4. **Graceful Degradation**: Errors don't crash the stream, they're part of it
5. **Security**: Production mode hides sensitive stack traces

## Example Error Messages

### Before Fix
```
3:"An error occurred."
```

### After Fix

**Database Error:**
```
3:"Database connection failed"
```

**Provider Error:**
```
3:"OpenAI provider not configured"
```

**Development Mode (with stack trace):**
```
3:"Database connection failed\n\nStack trace:\nError: Database connection failed\n    at ..."
```

## Related Files

- `src/lib/agents/routine.ts` - Main implementation
- `tests/agents/error-handling.test.ts` - Test suite
- `docs/ERROR-HANDLING-FIX.md` - This document

## References

- [Vercel AI SDK v4 Data Stream Format](https://sdk.vercel.ai/docs/ai-sdk-ui/stream-protocol)
- [Error Handling in streamText](https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling#error-handling)
