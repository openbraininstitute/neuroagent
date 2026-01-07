"""Configuration for tasks."""

from pydantic import BaseModel, ConfigDict, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from neuroagent.config import SettingsRedis, SettingsStorage


class SettingsExecutor(BaseModel):
    """Executor settings."""

    deno_allocated_memory: int | None = 8192
    additional_imports: list[str] | None = None

    model_config = ConfigDict(frozen=True)


class SettingsLLM(BaseModel):
    """LLM settings."""

    openai_token: SecretStr | None = None

    model_config = ConfigDict(frozen=True)


class SettingsCelery(BaseModel):
    """Celery worker settings.

    Note that all the fields default to None. Unless overridden, Celery will use its own defaults.

    If you want to expand the list of settings, refer to the following:
    https://celery.school/celery-config-env-vars
    """

    worker_concurrency: int | None = None

    model_config = ConfigDict(frozen=True)


class Settings(BaseSettings):
    """All settings for tasks."""

    storage: SettingsStorage = SettingsStorage()  # has no required
    redis: SettingsRedis = SettingsRedis()  # has no required
    executor: SettingsExecutor = SettingsExecutor()  # has no required
    llm: SettingsLLM = SettingsLLM()  # has no required
    celery: SettingsCelery = SettingsCelery()  # has no required

    model_config = SettingsConfigDict(
        env_file=".env.tasks",
        env_prefix="TASKS_",
        env_nested_delimiter="__",
        frozen=True,
        extra="ignore",
    )
