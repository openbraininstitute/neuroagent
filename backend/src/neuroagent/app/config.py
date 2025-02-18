"""Configuration."""

import os
import pathlib
from typing import Literal, Optional

from dotenv import dotenv_values
from pydantic import BaseModel, ConfigDict, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class SettingsAgent(BaseModel):
    """Agent setting."""

    model: Literal["simple", "multi"] = "simple"

    model_config = ConfigDict(frozen=True)


class SettingsStorage(BaseModel):
    """Storage settings."""

    endpoint_url: str = "http://localhost:9000"
    bucket_name: str = "neuroagent"
    access_key: SecretStr = SecretStr("minioadmin")
    secret_key: SecretStr = SecretStr("minioadmin")
    expires_in: int = 600

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


class SettingsLiterature(BaseModel):
    """Literature search API settings."""

    url: str
    retriever_k: int = 8
    use_reranker: bool = False
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
    br_saving_path: pathlib.Path | str = str(
        pathlib.Path(__file__).parent / "data" / "brainregion_hierarchy.json"
    )
    ct_saving_path: pathlib.Path | str = str(
        pathlib.Path(__file__).parent / "data" / "celltypes_hierarchy.json"
    )
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


class SettingsVlab(BaseModel):
    """Virtual lab endpoint settings."""

    get_project_url: str = (
        "https://openbluebrain.com/api/virtual-lab-manager/virtual-labs"
    )
    model_config = ConfigDict(frozen=True)


class SettingsTools(BaseModel):
    """Database settings."""

    literature: SettingsLiterature
    bluenaas: SettingsBlueNaaS = SettingsBlueNaaS()
    morpho: SettingsGetMorpho = SettingsGetMorpho()
    trace: SettingsTrace = SettingsTrace()
    kg_morpho_features: SettingsKGMorpho = SettingsKGMorpho()
    me_model: SettingsGetMEModel = SettingsGetMEModel()

    model_config = ConfigDict(frozen=True)


class SettingsOpenAI(BaseModel):
    """OpenAI settings."""

    token: Optional[SecretStr] = None
    model: str = "gpt-4o-mini"
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


class Settings(BaseSettings):
    """All settings."""

    tools: SettingsTools
    knowledge_graph: SettingsKnowledgeGraph
    agent: SettingsAgent = SettingsAgent()  # has no required
    db: SettingsDB = SettingsDB()  # has no required
    openai: SettingsOpenAI = SettingsOpenAI()  # has no required
    logging: SettingsLogging = SettingsLogging()  # has no required
    keycloak: SettingsKeycloak = SettingsKeycloak()  # has no required
    virtual_lab: SettingsVlab = SettingsVlab()  # has no required
    misc: SettingsMisc = SettingsMisc()  # has no required
    storage: SettingsStorage = SettingsStorage()  # has no required

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
