from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    GROQ_API_KEY: str = Field(
        default="",
        validation_alias=AliasChoices(
            "GROQ_API_KEY",
            "ANTHROPIC_API_KEY",
        ),
    )

    GROQ_MODEL: str = Field(
        default="openai/gpt-oss-120b",
        validation_alias=AliasChoices(
            "GROQ_MODEL",
            "ANTHROPIC_MODEL",
        ),
    )

    CHROMA_DIR: str = "./chroma_db"
    TOP_K: int = 8

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()