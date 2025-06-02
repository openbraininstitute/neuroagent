"""Main."""

import logging
from contextlib import aclosing, asynccontextmanager
from logging.config import dictConfig
from typing import Annotated, Any, AsyncContextManager
from uuid import uuid4

from asgi_correlation_id import CorrelationIdMiddleware
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
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
from neuroagent.app.app_utils import (
    get_br_embeddings,
    get_semantic_router,
    setup_engine,
)
from neuroagent.app.config import Settings
from neuroagent.app.dependencies import (
    get_connection_string,
    get_mcp_tool_list,
    get_s3_client,
    get_settings,
    get_tool_list,
)
from neuroagent.app.middleware import strip_path_prefix
from neuroagent.app.routers import qa, storage, threads, tools
from neuroagent.mcp import MCPClient

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
    app_settings: Settings = fastapi_app.dependency_overrides.get(
        get_settings, get_settings
    )()

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

    semantic_router = get_semantic_router(settings=app_settings)
    fastapi_app.state.semantic_router = semantic_router

    s3_client = get_s3_client(app_settings)
    br_embeddings = get_br_embeddings(
        s3_client=s3_client,
        bucket_name=app_settings.storage.bucket_name,
        folder="shared",
    )
    fastapi_app.state.br_embeddings = br_embeddings

    async with aclosing(
        AsyncAccountingSessionFactory(
            base_url=app_settings.accounting.base_url,
            disabled=app_settings.accounting.disabled,
        )
    ) as session_factory:
        fastapi_app.state.accounting_session_factory = session_factory

        async with MCPClient(config=app_settings.mcp) as mcp_client:
            # trigger dynamic tool generation - only done once - it is cached
            _ = fastapi_app.dependency_overrides.get(
                get_mcp_tool_list, get_mcp_tool_list
            )(mcp_client)
            fastapi_app.state.mcp_client = mcp_client
            yield

    # Cleanup connections
    if engine:
        await engine.dispose()

    if fastapi_app.state.redis_client is not None:
        await fastapi_app.state.redis_client.aclose()

    # MCP client cleanup is handled by the context manager


app = FastAPI(
    title="Agents",
    summary="API of the agentic chatbot from the Open Brain Institute",
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


def custom_openapi() -> dict[str, Any]:
    """Add tool outputs to the openapi."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="Agents",
        version=__version__,
        summary="API of the agentic chatbot from the Open Brain Institute",
        routes=app.routes,
        servers=app.servers,
    )

    # TODO: Add the list of MCP tools as input of `get_tool_list`
    tool_list = app.dependency_overrides.get(get_tool_list, get_tool_list)([])
    for tool in tool_list:
        tool_output_type = tool.arun.__annotations__["return"]
        tool_schema = tool_output_type.model_json_schema(
            ref_template="#/components/schemas/{model}"
        )
        defs = tool_schema.pop("$defs", None)

        # Find nested models and define them as their own schemas instead of having nested '$defs'
        if defs:
            openapi_schema["components"]["schemas"].update(defs)
        openapi_schema["components"]["schemas"][tool_output_type.__name__] = tool_schema

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore


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
