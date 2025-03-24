"""Configuration."""

import os
from typing import Any, Literal, Optional

from dotenv import dotenv_values
from pydantic import BaseModel, ConfigDict, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class SettingsAgent(BaseModel):
    """Agent setting."""

    model: Literal["simple", "multi"] = "simple"

    model_config = ConfigDict(frozen=True)


class SettingsStorage(BaseModel):
    """Storage settings."""

    endpoint_url: str | None = None
    bucket_name: str = "neuroagent"
    access_key: SecretStr | None = None
    secret_key: SecretStr | None = None
    expires_in: int = 600
    brain_region_hierarchy_key: str = "shared/brainregion_hierarchy.json"
    cell_type_hierarchy_key: str = "shared/celltypes_hierarchy.json"

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

    issuer: str = "https://openbluebrain.com/auth/realms/SBO"
    model_config = ConfigDict(frozen=True)

    @property
    def user_info_endpoint(self) -> str | None:
        """Define the user_info endpoint."""
        return f"{self.issuer}/protocol/openid-connect/userinfo"


class SettingsSemanticScholar(BaseModel):
    """Literature search API settings."""

    api_key: SecretStr | None = None

    model_config = ConfigDict(frozen=True)


class SettingsWebSearch(BaseModel):
    """Literature search API settings."""

    tavily_api_key: SecretStr | None = None

    model_config = ConfigDict(frozen=True)


class SettingsLiterature(BaseModel):
    """Literature search API settings."""

    url: str
    retriever_k: int = 500
    use_reranker: bool = True
    reranker_k: int = 8

    model_config = ConfigDict(frozen=True)


class SettingsTrace(BaseModel):
    """Trace tool settings."""

    search_size: int = 10

    model_config = ConfigDict(frozen=True)


class SettingsKGMorpho(BaseModel):
    """KG Morpho settings."""

    search_size: int = 3

    model_config = ConfigDict(frozen=True)


class SettingsGetMorpho(BaseModel):
    """Get Morpho settings."""

    search_size: int = 10

    model_config = ConfigDict(frozen=True)


class SettingsGetMEModel(BaseModel):
    """Get ME Model settings."""

    search_size: int = 10

    model_config = ConfigDict(frozen=True)


class SettingsBlueNaaS(BaseModel):
    """BlueNaaS settings."""

    url: str = "https://openbluebrain.com/api/bluenaas"
    model_config = ConfigDict(frozen=True)


class SettingsKnowledgeGraph(BaseModel):
    """Knowledge graph API settings."""

    base_url: str
    model_config = ConfigDict(frozen=True)

    @property
    def url(self) -> str:
        """Knowledge graph search url."""
        return f"{self.base_url}/search/query/"

    @property
    def sparql_url(self) -> str:
        """Knowledge graph view for sparql query."""
        return f"{self.base_url}/views/neurosciencegraph/datamodels/https%3A%2F%2Fbluebrain.github.io%2Fnexus%2Fvocabulary%2FdefaultSparqlIndex/sparql"

    @property
    def class_view_url(self) -> str:
        """Knowledge graph view for ES class query."""
        return f"{self.base_url}/views/neurosciencegraph/datamodels/https%3A%2F%2Fbbp.epfl.ch%2Fneurosciencegraph%2Fdata%2Fviews%2Fes%2Fdataset/_search"

    @property
    def hierarchy_url(self) -> str:
        """Knowledge graph url for brainregion/celltype files."""
        return "http://bbp.epfl.ch/neurosciencegraph/ontologies/core"


class SettingsTools(BaseModel):
    """Database settings."""

    literature: SettingsLiterature
    bluenaas: SettingsBlueNaaS = SettingsBlueNaaS()
    morpho: SettingsGetMorpho = SettingsGetMorpho()
    trace: SettingsTrace = SettingsTrace()
    kg_morpho_features: SettingsKGMorpho = SettingsKGMorpho()
    me_model: SettingsGetMEModel = SettingsGetMEModel()
    web_search: SettingsWebSearch = SettingsWebSearch()
    semantic_scholar: SettingsSemanticScholar = SettingsSemanticScholar()

    model_config = ConfigDict(frozen=True)


class SettingsOpenAI(BaseModel):
    """OpenAI settings."""

    token: Optional[SecretStr] = None
    model: str = "gpt-4o-mini"
    suggestion_model: str = "gpt-4o-mini"
    temperature: float = 0
    max_tokens: Optional[int] = None

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

    frontend_url: str | None = "http://localhost:3000"

    model_config = ConfigDict(frozen=True)


class SettingsRateLimiter(BaseModel):
    """Rate limiter settings."""

    redis_host: str = "localhost"
    redis_port: int = 6379
    disabled: bool = False

    limit_chat: int = 20
    expiry_chat: int = 24 * 60 * 60  # seconds

    limit_suggestions: int = 100
    expiry_suggestions: int = 24 * 60 * 60  # seconds

    model_config = ConfigDict(frozen=True)


class SettingsAccounting(BaseModel):
    """Accounting settings."""

    base_url: str | None = None
    disabled: bool = False

    @model_validator(mode="before")
    @classmethod
    def disable_if_no_url(cls, data: Any) -> Any:
        """Disable accounting if no base URL is provided."""
        if data is None:
            return data

        if data.get("base_url") is None:
            data["disabled"] = True

        return data


class Settings(BaseSettings):
    """All settings."""

    tools: SettingsTools
    knowledge_graph: SettingsKnowledgeGraph
    agent: SettingsAgent = SettingsAgent()  # has no required
    db: SettingsDB = SettingsDB()  # has no required
    openai: SettingsOpenAI = SettingsOpenAI()  # has no required
    logging: SettingsLogging = SettingsLogging()  # has no required
    keycloak: SettingsKeycloak = SettingsKeycloak()  # has no required
    misc: SettingsMisc = SettingsMisc()  # has no required
    storage: SettingsStorage = SettingsStorage()  # has no required
    rate_limiter: SettingsRateLimiter = SettingsRateLimiter()  # has no required
    accounting: SettingsAccounting = SettingsAccounting()  # has no required

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="NEUROAGENT_",
        env_nested_delimiter="__",
        frozen=True,
        extra="ignore",
    )


# Load the remaining variables into the environment
# Necessary for things like SSL_CERT_FILE
config = dotenv_values()
for k, v in config.items():
    if k.lower().startswith("neuroagent_"):
        continue
    if v is None:
        continue
    os.environ[k] = os.environ.get(k, v)  # environment has precedence
