"""Configuration for tasks."""

from pydantic import BaseModel, ConfigDict, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class SettingsStorage(BaseModel):
    """Storage settings."""

    endpoint_url: str | None = None
    bucket_name: str = "neuroagent"
    access_key: SecretStr | None = None
    secret_key: SecretStr | None = None
    expires_in: int = 600

    model_config = ConfigDict(frozen=True)


class SettingsCelery(BaseModel):
    """Celery settings."""

    broker_url: str = "redis://localhost:6379"
    result_backend: str = "redis://localhost:6379"

    model_config = ConfigDict(frozen=True)


class SettingsExecutor(BaseModel):
    """Executor settings."""

    deno_allocated_memory: int | None = 8192
    additional_imports: list[str] | None = None

    model_config = ConfigDict(frozen=True)


class Settings(BaseSettings):
    """All settings for tasks."""

    storage: SettingsStorage = SettingsStorage()  # has no required
    celery: SettingsCelery = SettingsCelery()  # has no required
    executor: SettingsExecutor = SettingsExecutor()  # has no required

    model_config = SettingsConfigDict(
        env_file=".env.tasks",
        env_prefix="TASKS_",
        env_nested_delimiter="__",
        frozen=True,
        extra="ignore",
    )
