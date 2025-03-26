"""Main."""

import logging
from contextlib import aclosing, asynccontextmanager
from logging.config import dictConfig
from typing import Annotated, Any, AsyncContextManager
from uuid import uuid4

from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from obp_accounting_sdk import AsyncAccountingSessionFactory
from obp_accounting_sdk.errors import (
    AccountingReservationError,
    AccountingUsageError,
    InsufficientFundsError,
)
from redis import asyncio as aioredis
from starlette import status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from neuroagent import __version__
from neuroagent.app.app_utils import setup_engine
from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_connection_string,
    get_settings,
)
from neuroagent.app.middleware import strip_path_prefix
from neuroagent.app.routers import qa, storage, threads, tools

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {
        "correlation_id": {
            "()": "asgi_correlation_id.CorrelationIdFilter",
            "uuid_length": 32,
            "default_value": "-",
        },
    },
    "formatters": {
        "request_id": {
            "class": "logging.Formatter",
            "format": (
                "[%(levelname)s] %(asctime)s (%(correlation_id)s) %(name)s %(message)s"
            ),
        },
    },
    "handlers": {
        "request_id": {
            "class": "logging.StreamHandler",
            "filters": ["correlation_id"],
            "formatter": "request_id",
        },
    },
    "loggers": {
        "": {
            "handlers": ["request_id"],
            "level": "INFO",
            "propagate": True,
        },
    },
}
dictConfig(LOGGING)

logger = logging.getLogger(__name__)


@asynccontextmanager  # type: ignore
async def lifespan(fastapi_app: FastAPI) -> AsyncContextManager[None]:  # type: ignore
    """Read environment (settings of the application)."""
    app_settings = fastapi_app.dependency_overrides.get(get_settings, get_settings)()

    # Initialize Redis client if rate limiting is enabled
    if not app_settings.rate_limiter.disabled:
        redis_client = aioredis.Redis(
            host=app_settings.rate_limiter.redis_host,
            port=app_settings.rate_limiter.redis_port,
            decode_responses=True,
        )
        fastapi_app.state.redis_client = redis_client
    else:
        fastapi_app.state.redis_client = None

    # Get the sqlalchemy engine and store it in app state.
    engine = setup_engine(app_settings, get_connection_string(app_settings))
    fastapi_app.state.engine = engine

    prefix = app_settings.misc.application_prefix
    fastapi_app.openapi_url = f"{prefix}/openapi.json"
    fastapi_app.servers = [{"url": prefix}]

    # Do not rely on the middleware order in the list "fastapi_app.user_middleware" since this is subject to changes.
    try:
        cors_middleware = filter(
            lambda x: x.__dict__["cls"] == CORSMiddleware, fastapi_app.user_middleware
        ).__next__()
        cors_middleware.kwargs["allow_origins"] = (
            app_settings.misc.cors_origins.replace(" ", "").split(",")
        )
    except StopIteration:
        pass

    logging.getLogger().setLevel(app_settings.logging.external_packages.upper())
    logging.getLogger("neuroagent").setLevel(app_settings.logging.level.upper())
    logging.getLogger("bluepyefe").setLevel("CRITICAL")

    async with aclosing(
        AsyncAccountingSessionFactory(
            base_url=app_settings.accounting.base_url,
            disabled=app_settings.accounting.disabled,
        )
    ) as session_factory:
        fastapi_app.state.accounting_session_factory = session_factory

        yield

    # Cleanup connections
    if engine:
        await engine.dispose()

    if fastapi_app.state.redis_client is not None:
        await fastapi_app.state.redis_client.aclose()


app = FastAPI(
    title="Agents",
    summary=(
        "Use an AI agent to answer queries based on the knowledge graph, literature"
        " search and neuroM."
    ),
    version=__version__,
    swagger_ui_parameters={"tryItOutEnabled": True},
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    CorrelationIdMiddleware,
    header_name="X-Request-ID",
    update_request_header=True,
    generator=lambda: uuid4().hex,
    transformer=lambda a: a,
)
app.add_middleware(BaseHTTPMiddleware, dispatch=strip_path_prefix)

app.include_router(qa.router)
app.include_router(threads.router)
app.include_router(tools.router)
app.include_router(storage.router)


@app.exception_handler(InsufficientFundsError)
async def insufficient_funds_error_handler(
    _request: Request, exc: InsufficientFundsError
) -> JSONResponse:
    """Handle insufficient funds errors."""
    return JSONResponse(
        status_code=status.HTTP_402_PAYMENT_REQUIRED,
        content={"message": f"Error: {exc.__class__.__name__}"},
    )


@app.exception_handler(AccountingReservationError)
@app.exception_handler(AccountingUsageError)
async def accounting_error_handler(
    _request: Request, exc: AccountingReservationError | AccountingUsageError
) -> JSONResponse:
    """Handle accounting errors."""
    # forward the http error code from upstream
    status_code = exc.http_status_code or status.HTTP_500_INTERNAL_SERVER_ERROR
    return JSONResponse(
        status_code=status_code,
        content={"message": f"Error: {exc.__class__.__name__}"},
    )


@app.get("/healthz")
def healthz() -> str:
    """Check the health of the API."""
    return "200"


@app.get("/")
def readyz() -> dict[str, str]:
    """Check if the API is ready to accept traffic."""
    return {"status": "ok"}


@app.get("/settings")
def settings(settings: Annotated[Settings, Depends(get_settings)]) -> Any:
    """Show complete settings of the backend.

    Did not add return model since it pollutes the Swagger UI.
    """
    return settings
