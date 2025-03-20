"""Middleware."""

import re
from typing import Any, Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse

from neuroagent.app.dependencies import get_settings


async def rate_limit(request: Request, call_next: Callable[[Any], Any]) -> Response:
    """Rate limit requests based on path and method.

    Parameters
    ----------
    request : Request
        The incoming request to be rate limited
    call_next : Callable
        The next middleware or route handler to call

    Returns
    -------
    Response
        The response from the next handler

    Raises
    ------
    HTTPException
        If the rate limit is exceeded
    """
    settings = get_settings()

    # Skip if rate limiting is disabled
    if settings.rate_limiter.disabled:
        return await call_next(request)

    # Get Redis client from app state
    redis = request.app.state.redis_client
    if redis is None:
        return await call_next(request)

    path = request.url.path
    method = request.method

    # Find matching route spec
    matching_route = None
    for route in settings.rate_limiter.routes:
        if re.match(route.route, path) and route.method == method:
            matching_route = route
            break

    if matching_route is None:
        return await call_next(request)

    # Create clean key using normalized path
    key = f"rate_limit:{matching_route.normalized_path}:{method}"

    # Get current count
    current = await redis.get(key)
    current = int(current) if current else 0

    if current > 0:
        if current + 1 > matching_route.limit:
            # Get remaining time
            ttl = await redis.pttl(key)
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "retry_after": ttl,  # Use seconds directly
                },
            )
        await redis.incr(key)
    else:
        await redis.set(
            key,
            1,
            ex=matching_route.expiry,  # Use seconds directly
        )

    return await call_next(request)


async def strip_path_prefix(
    request: Request, call_next: Callable[[Any], Any]
) -> Response:
    """Optionally strip a prefix from a request path.

    Parameters
    ----------
    request
        Request sent by the user.
    call_next
        Function executed to get the output of the endpoint.

    Returns
    -------
    response: Response of the request after potentially stripping prefix from path and applying other middlewares
    """
    if request.base_url in (
        "http://testserver/",
        "http://test/",
    ) and "healthz" not in str(request.url):
        settings = request.app.dependency_overrides[get_settings]()
    else:
        settings = get_settings()
    prefix = settings.misc.application_prefix
    if prefix is not None and len(prefix) > 0 and request.url.path.startswith(prefix):
        new_path = request.url.path[len(prefix) :]
        scope = request.scope
        scope["path"] = new_path
        request = Request(scope, request.receive)
    return await call_next(request)
