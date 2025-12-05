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


class SettingsRedis(BaseModel):
    """Redis settings."""

    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: SecretStr | None = None
    redis_ssl: bool = False

    model_config = ConfigDict(frozen=True)

    @property
    def redis_url(self) -> str:
        """Build Redis URL from settings.

        Returns
        -------
        str
            Redis URL in the format redis://[password@]host:port or rediss://[password@]host:port
        """
        redis_password_str = (
            self.redis_password.get_secret_value()
            if self.redis_password is not None
            else None
        )
        protocol = "rediss://" if self.redis_ssl else "redis://"
        if redis_password_str:
            return (
                f"{protocol}:{redis_password_str}@{self.redis_host}:{self.redis_port}"
            )
        else:
            return f"{protocol}{self.redis_host}:{self.redis_port}"


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
