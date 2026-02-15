import json
import logging
import os

logger = logging.getLogger(__name__)


def get_ai_completion(system_prompt, user_prompt, max_tokens=1000, temperature=0.7):
    """
    Get AI completion from available provider.
    Tries Anthropic first, then OpenAI, then returns a rule-based fallback.
    """
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if anthropic_key:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=anthropic_key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=max_tokens,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
                temperature=temperature,
            )
            text = response.content[0].text if response.content else ""
            return text
        except Exception as e:
            logger.warning("Anthropic API error: %s", e)

    openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if openai_key:
        try:
            import openai

            client = openai.OpenAI(api_key=openai_key)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            logger.warning("OpenAI API error: %s", e)

    logger.info("No AI provider available, using rule-based fallback")
    return None


def get_ai_json(system_prompt, user_prompt, max_tokens=1000):
    """
    Get AI completion and parse as JSON.
    System prompt should instruct the model to respond only in JSON.
    """
    system_prompt += (
        "\n\nRespond ONLY with valid JSON. No markdown, no backticks, no preamble."
    )
    result = get_ai_completion(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=max_tokens,
        temperature=0.3,
    )
    if result:
        try:
            cleaned = result.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
            if cleaned.startswith("json"):
                cleaned = cleaned[4:].strip()
            return json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning("Failed to parse AI JSON response: %s", result[:200])
    return None
