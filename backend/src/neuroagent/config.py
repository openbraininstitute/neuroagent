"""Shared configuration classes."""

from pydantic import BaseModel, ConfigDict, SecretStr


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
