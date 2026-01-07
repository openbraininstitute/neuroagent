"""Configuration."""

import json
import logging
import os
from pathlib import Path
from typing import Any, Literal

from dotenv import dotenv_values
from pydantic import BaseModel, ConfigDict, Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from neuroagent.config import SettingsRedis, SettingsStorage

logger = logging.getLogger(__name__)


class SettingsAgent(BaseModel):
    """Agent setting."""

    model: Literal["simple", "multi"] = "simple"
    max_turns: int = 10
    max_parallel_tool_calls: int = 10

    model_config = ConfigDict(frozen=True)


class SettingsDB(BaseModel):
    """DB settings for retrieving history."""

    prefix: str | None = None
    user: str | None = None
    password: SecretStr | None = None
    host: str | None = None
    port: str | None = None
    name: str | None = None

    model_config = ConfigDict(frozen=True)


class SettingsKeycloak(BaseModel):
    """Class retrieving keycloak info for authorization."""

    issuer: str = "https://www.openbraininstitute.org/auth/realms/SBO"
    model_config = ConfigDict(frozen=True)

    @property
    def user_info_endpoint(self) -> str | None:
        """Define the user_info endpoint."""
        return f"{self.issuer}/protocol/openid-connect/userinfo"


class SettingsThumbnailGeneration(BaseModel):
    """Settings of the Thumbnail-Generation endpoints."""

    url: str = "https://openbraininstitute.org/api/thumbnail-generation"

    model_config = ConfigDict(frozen=True)


class SettingsObiOne(BaseModel):
    """Settings of the OBI-One endpoints."""

    url: str = "https://openbraininstitute.org/api/obi-one"

    model_config = ConfigDict(frozen=True)


class SettingsBlueNaaS(BaseModel):
    """BlueNaaS settings."""

    url: str = "https://www.openbraininstitute.org/api/bluenaas"
    model_config = ConfigDict(frozen=True)


class SettingsEntityCore(BaseModel):
    """Entitycore settings."""

    url: str = "https://openbraininstitute.org/api/entitycore"
    model_config = ConfigDict(frozen=True)


class SettingsSanity(BaseModel):
    """Sanity settings."""

    project_id: str = "fgi7eh1v"
    dataset: Literal["staging", "production"] = "staging"
    version: str = "v2025-02-19"
    model_config = ConfigDict(frozen=True)

    @property
    def url(self) -> str:
        """Define the url for the sanity API."""
        return f"https://{self.project_id}.api.sanity.io/{self.version}/data/query/{self.dataset}"


class SettingsTools(BaseModel):
    """Database settings."""

    obi_one: SettingsObiOne = SettingsObiOne()
    bluenaas: SettingsBlueNaaS = SettingsBlueNaaS()
    entitycore: SettingsEntityCore = SettingsEntityCore()
    sanity: SettingsSanity = SettingsSanity()
    thumbnail_generation: SettingsThumbnailGeneration = SettingsThumbnailGeneration()
    frontend_base_url: str = "https://openbraininstitute.org"
    min_tool_selection: int = Field(default=5, ge=0)
    whitelisted_tool_regex: str | None = None
    deno_allocated_memory: int | None = 8192
    exa_api_key: SecretStr | None = None

    model_config = ConfigDict(frozen=True)


class SettingsLLM(BaseModel):
    """OpenAI settings."""

    openai_token: SecretStr | None = None
    openai_base_url: str | None = None
    open_router_token: SecretStr | None = None
    suggestion_model: str = "gpt-5-nano"
    default_chat_model: str = "gpt-5-mini"  # In case of error in model selection
    default_chat_reasoning: str = "low"
    temperature: float = 1
    max_tokens: int | None = None
    whitelisted_model_ids_regex: str = "openai.*"

    model_config = ConfigDict(frozen=True)


class SettingsLogging(BaseModel):
    """Metadata settings."""

    level: Literal["debug", "info", "warning", "error", "critical"] = "info"
    external_packages: Literal["debug", "info", "warning", "error", "critical"] = (
        "warning"
    )

    model_config = ConfigDict(frozen=True)


class SettingsMisc(BaseModel):
    """Other settings."""

    application_prefix: str = ""
    # list is not hashable, the cors_origins have to be provided as a string with
    # comma separated entries, i.e. "value_1, value_2, ..."
    cors_origins: str = ""

    # Query size limiter, in number of characters. (630 words ~= 5000 characters.)
    query_max_size: int = 10000

    model_config = ConfigDict(frozen=True)


class SettingsRateLimiter(BaseModel):
    """Rate limiter settings."""

    disabled: bool = False

    limit_chat: int = 20
    expiry_chat: int = 24 * 60 * 60  # seconds

    limit_suggestions_outside: int = 100
    limit_suggestions_inside: int = 500
    expiry_suggestions: int = 24 * 60 * 60  # seconds

    limit_title: int = 10
    expiry_title: int = 24 * 60 * 60  # seconds

    model_config = ConfigDict(frozen=True)


class SettingsAccounting(BaseModel):
    """Accounting settings."""

    base_url: str | None = None
    disabled: bool = False

    model_config = ConfigDict(frozen=True)

    @model_validator(mode="before")
    @classmethod
    def disable_if_no_url(cls, data: Any) -> Any:
        """Disable accounting if no base URL is provided."""
        if data is None:
            return data

        if data.get("base_url") is None:
            data["disabled"] = True

        return data


class MCPToolMetadata(BaseModel):
    """Metadata of the MCP tools. Overrides native ones."""

    name: str | None = None
    name_frontend: str | None = None
    description: str | None = None
    description_frontend: str | None = None
    utterances: list[str] | None = None

    model_config = ConfigDict(frozen=True)


class MCPServerConfig(BaseModel):
    """Configuration for a single MCP server."""

    command: str
    args: list[str] | None = None
    env: dict[str, SecretStr] | None = None
    tool_metadata: dict[str, MCPToolMetadata] | None = None

    model_config = ConfigDict(frozen=True)


class SettingsMCP(BaseModel):
    """Settings for the MCP."""

    servers: dict[str, MCPServerConfig] | None = None

    model_config = ConfigDict(frozen=True)

    def __hash__(self) -> int:
        """Hash the instance."""
        dump = self.model_dump()
        # Turn nested dicts/lists into a stable tuple form for hashing
        return hash(self._freeze(dump))

    @staticmethod
    def _freeze(obj: Any) -> Any:
        if isinstance(obj, dict):
            return tuple(sorted((k, SettingsMCP._freeze(v)) for k, v in obj.items()))
        if isinstance(obj, list):
            return tuple(SettingsMCP._freeze(v) for v in obj)
        return obj


class Settings(BaseSettings):
    """All settings."""

    tools: SettingsTools = SettingsTools()
    agent: SettingsAgent = SettingsAgent()  # has no required
    db: SettingsDB = SettingsDB()  # has no required
    llm: SettingsLLM = SettingsLLM()  # has no required
    logging: SettingsLogging = SettingsLogging()  # has no required
    keycloak: SettingsKeycloak = SettingsKeycloak()  # has no required
    misc: SettingsMisc = SettingsMisc()  # has no required
    storage: SettingsStorage = SettingsStorage()  # has no required
    redis: SettingsRedis = SettingsRedis()  # has no required
    rate_limiter: SettingsRateLimiter = SettingsRateLimiter()  # has no required
    accounting: SettingsAccounting = SettingsAccounting()  # has no required
    mcp: SettingsMCP = SettingsMCP()  # has no required

    model_config = SettingsConfigDict(
        env_file=".env.app",
        env_prefix="NEUROAGENT_",
        env_nested_delimiter="__",
        frozen=True,
        extra="ignore",
    )

    @model_validator(mode="before")
    @classmethod
    def parse_mcp_servers(cls, data: Any) -> Any:
        """Read the `mcp.json` file and parse mcp servers."""
        # Read the server config
        with (Path(__file__).parent.parent / "mcp.json").open() as f:
            servers = f.read()

        # Replace placeholders with secret values in server config
        if "mcp" in data.keys():
            for secret_key, secret_value in data["mcp"].get("secrets", {}).items():
                placeholder = f"NEUROAGENT_MCP__SECRETS__{secret_key.upper()}"
                replacement = secret_value or ""
                servers = servers.replace(placeholder, replacement)

        mcps: dict[str, dict[str, Any]] = {"servers": {}}
        # Parse and set the mcp servers
        for server, config in json.loads(servers).items():
            # If a secret is not set, do not include the associated server
            if config.get("env") and any(
                "NEUROAGENT_MCP__SECRETS__" in value for value in config["env"].values()
            ):
                logger.warning(
                    f"MCP server {server} deactivated because some of its secrets were not provided."
                )
                continue
            mcps["servers"][server] = config

        data["mcp"] = mcps

        return data


# Load the remaining variables into the environment
# Necessary for things like SSL_CERT_FILE
config = dotenv_values()
for k, v in config.items():
    if k.lower().startswith("neuroagent_"):
        continue
    if v is None:
        continue
    os.environ[k] = os.environ.get(k, v)  # environment has precedence
