"""Thin async wrapper around the OpenAI Chat Completions API."""

from __future__ import annotations

from typing import Any

import backoff
import openai

from alphaevolve.config import settings

from .base_client import LLMClient


class OpenAIClient(LLMClient):
    """Concrete :class:`LLMClient` using OpenAI's Chat Completions API."""

    def __init__(self) -> None:
        openai.api_type = "openai"
        openai.api_key = settings.openai_api_key
        self._client = openai.AsyncOpenAI(api_key=settings.openai_api_key)

    @backoff.on_exception(backoff.expo, openai.OpenAIError, max_tries=5, jitter=backoff.full_jitter)
    async def chat(self, messages: list[dict[str, str]], **kw) -> Any:
        """Call OpenAI chat completion returning the ``message`` of the first choice."""
        response_format = {"type": "json_object"}
        params = {
            "model": settings.openai_model,
            "messages": messages,
            "max_completion_tokens": settings.max_completion_tokens,
            "response_format": response_format,
        }
        params.update(kw)
        completion = await self._client.chat.completions.create(**params)
        return completion.choices[0].message


# Backwards compatible helper
client = OpenAIClient()


async def chat(messages: list[dict[str, str]], **kw) -> Any:  # pragma: no cover - thin wrapper
    """Module level helper calling :class:`OpenAIClient.chat`."""
    return await client.chat(messages, **kw)
