import json
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError
from groq import Groq
from app.config import settings

client = Groq(api_key=settings.GROQ_API_KEY or "missing_api_key")
T = TypeVar("T", bound=BaseModel)

class LLMError(Exception):
    """Typed exception for LLM API or JSON schema validation failures."""
    pass

def generate_structured(system_prompt: str, user_prompt: str, schema: Type[T]) -> T:
    """
    Single LLM wrapper taking system_prompt + user_prompt and returning parsed JSON
    validated against the provided Pydantic model. Retries once with validation error
    appended before raising LLMError.
    """
    schema_json = schema.model_json_schema()
    system_content = (
        f"{system_prompt}\n\n"
        f"You must respond ONLY with a valid JSON object matching this exact JSON Schema:\n"
        f"{json.dumps(schema_json)}"
    )

    messages = [
        {"role": "system", "content": system_content},
        {"role": "user", "content": user_prompt}
    ]

    content = ""
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = response.choices[0].message.content or ""
            if not content.strip():
                raise LLMError("Empty response received from LLM")

            return schema.model_validate_json(content)

        except ValidationError as e:
            if attempt == 1:
                raise LLMError(f"JSON validation failed after retry: {str(e)}")
            messages.append({"role": "assistant", "content": content})
            messages.append({
                "role": "user",
                "content": f"Validation failed with error:\n{str(e)}\nFix the JSON to match the required schema."
            })
        except LLMError:
            raise
        except Exception as e:
            raise LLMError(f"LLM request failed: {str(e)}")

    raise LLMError("Exhausted LLM retries")