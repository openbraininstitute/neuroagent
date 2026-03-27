"""Navigate tool — use an LLM to resolve a natural-language page description into a valid platform URL."""

import json
import logging
from pathlib import Path
from typing import ClassVar
from urllib.parse import urlparse

from openai import AsyncOpenAI
from pydantic import AnyHttpUrl, BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool
from neuroagent.utils import get_token_count

logger = logging.getLogger(__name__)

# Load the sitemap once at module level.
_SITEMAP_PATH = Path(__file__).resolve().parent.parent / "sitemap-agent.json"
_SITEMAP = json.loads(_SITEMAP_PATH.read_text())

_SYSTEM_PROMPT_TEMPLATE = """\
You are a URL generator for a neuroscience web platform.

BASE_URL: {base_url}

SITEMAP:
{sitemap_json}

The user will describe, in plain English, the page they want to reach. The description may
include concrete values for variable parts (IDs, entity types, slugs, etc.).

Your job:
- Pick the single route from the SITEMAP that best matches the request.
- Substitute every path parameter with the concrete value provided in the request.
  For routes under /app/virtual-lab/[virtualLabId]/[projectId]/..., those two segments are
  already present in BASE_URL — just append the remaining path.
- Add query/search parameters only when the request explicitly or implicitly asks for them.
- Return ONLY the final absolute URL. No explanation, no markdown, no quotes — just the raw URL.

Rules:
- If the request mentions an entity ID, slot it into the correct [id] segment.
- If the request mentions an entity type, use the kebab-case slug from the sitemap.
- If a search param has a fixed set of allowed values, only use one of those values.
- Never invent path segments or parameters that are not in the sitemap.
- When the route lives under /app/virtual-lab/[virtualLabId]/[projectId], build the URL by
  appending to BASE_URL (do NOT duplicate the /app/virtual-lab/vlabId/projectId prefix).
- For routes NOT under that prefix (e.g. /app/entity/[id], /gallery, /app/documentation/...),
  extract the scheme+host from BASE_URL and build the URL from that.
"""


class NavigateInput(BaseModel):
    """Input schema for the Navigate tool."""

    description: str = Field(
        description=(
            "A plain-English description of the page to navigate to. "
            "Include any concrete values needed to build the URL: entity IDs, "
            "entity types (e.g. 'memodel', 'cell-morphology'), brain region IDs, "
            "workflow phases, section tabs, scope, slugs, etc. "
            "Examples: "
            "'the data browse page for cell morphologies in the project scope', "
            "'the detail view of memodel entity abc-123, overview tab', "
            "'the simulate configuration page for circuit entity def-456', "
            "'the project home page', "
            "'the help page, glossary tab, term neuron'."
        ),
    )


class NavigateMetadata(BaseMetadata):
    """Metadata for the Navigate tool."""

    current_frontend_url: str
    openai_client: AsyncOpenAI
    token_consumption: dict[str, str | int | None] | None = None


class NavigateOutput(BaseModel):
    """Output of the Navigate tool."""

    url: AnyHttpUrl


class NavigateTool(BaseTool):
    """Generate a platform URL from a natural-language description using an internal LLM call."""

    name: ClassVar[str] = "navigate"
    name_frontend: ClassVar[str] = "Navigate"
    utterances: ClassVar[list[str]] = [
        "Take me to the morphology page",
        "Show me all the e-models",
        "Open the experimental data for bouton density",
        "I want to see circuit X",
        "Navigate to the ion channel recordings",
        "Go to the simulation results",
        "Show me entity abc-123",
        "Open the analysis tab for this me-model",
        "Go to the workflows page",
        "Show me the build workflow for memodel",
        "I want to start a new single neuron simulation",
        "Open the configure page for this circuit simulation",
        "Take me to the simulate phase",
        "Show me my notebooks",
        "Open the project notebooks",
        "Go to the reports page",
        "Navigate to the home page",
        "Open the team management page",
        "How many credits do I have left?",
        "Where can I get help?",
        "Show me the project morphologies",
        "Browse models in the thalamus",
    ]
    description: ClassVar[
        str
    ] = """Generate a valid platform URL to navigate the user to a specific page.

Use this tool generously. Whenever your answer mentions a page, entity, workflow,
or section of the platform, call this tool to produce a clickable link so the user
can jump there directly. Do not hesitate to make multiple calls in a single response
to enrich your answer with links — this dramatically improves the user experience.

# When to Use
- The user explicitly asks to navigate, open, or go to a page.
- You mention or reference any entity, workflow, notebook, or platform section in
  your answer — proactively generate a link even if the user did not ask for one.
- You want to point the user to a specific detail view, browse page, or workflow step.
- You are listing entities or results and want each item to be clickable.

# Input
Provide a plain-English `description` of the target page. Include ALL variable parts
(entity IDs, entity type slugs, brain region IDs, section tabs, scope, etc.) so the
tool can build the correct URL. For example:
- "the data browse page for cell morphologies, project scope"
- "the detail view of memodel entity 550e8400-e29b-41d4-a716-446655440000, analysis tab"
- "the simulate configuration page for circuit entity 6ba7b810-9dad-11d1-80b4-00c04fd430c8"

# Output
Returns a single `url` field. Always present it to the user as a markdown clickable link.

# Important Behavior
This tool only generates a URL — it does NOT change the page. The user must click the
link to navigate. After calling this tool, stop and present the link.
"""
    description_frontend: ClassVar[str] = (
        "Generate a navigation URL to a platform page."
    )
    metadata: NavigateMetadata
    input_schema: NavigateInput

    async def arun(self) -> NavigateOutput:
        """Resolve the natural-language description into a URL via an LLM call."""
        base_url = self._extract_base_url()

        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(
            base_url=base_url,
            sitemap_json=json.dumps(_SITEMAP, indent=2),
        )

        model = "gpt-5.4-nano"
        response = await self.metadata.openai_client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": self.input_schema.description},
            ],
            reasoning_effort="low",
        )

        raw_url = (response.choices[0].message.content or "").strip().strip("`\"' ")

        # Track token usage
        token_consumption = get_token_count(response.usage)
        self.metadata.token_consumption = {**token_consumption, "model": model}

        return NavigateOutput(url=raw_url)  # type: ignore[arg-type]

    def _extract_base_url(self) -> str:
        """Return the project base URL from current_frontend_url.

        e.g. https://<host>/app/virtual-lab/<vlabId>/<projectId>
        """
        parsed = urlparse(self.metadata.current_frontend_url)
        segments = parsed.path.strip("/").split("/")
        host_url = f"{parsed.scheme}://{parsed.netloc}"

        if len(segments) >= 4 and segments[0] == "app" and segments[1] == "virtual-lab":
            return f"{host_url}/app/virtual-lab/{segments[2]}/{segments[3]}"

        return host_url

    @classmethod
    async def is_online(cls) -> bool:
        """Tool always online. No external dependencies."""
        return True
