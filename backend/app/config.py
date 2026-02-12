from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    cors_allow_origins: str = "*"
    clerk_jwks_url: str = ""
    clerk_issuer: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
