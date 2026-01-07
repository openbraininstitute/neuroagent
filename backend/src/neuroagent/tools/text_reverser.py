"""Text reverser tool for string manipulation."""

import logging
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class TextReverserInput(BaseModel):
    """Input schema for Text Reverser tool."""

    text: str = Field(description="Text to reverse")
    reverse_words: bool = Field(
        default=False, 
        description="If True, reverse word order instead of character order"
    )


class TextReverserMetadata(BaseMetadata):
    """Metadata for Text Reverser tool."""

    pass


class TextReverserToolOutput(BaseModel):
    """Output of the text reverser tool."""

    original_text: str
    reversed_text: str
    reverse_type: str


class TextReverserTool(BaseTool):
    """Tool that reverses text either by characters or by word order."""

    name: ClassVar[str] = "text-reverser-tool"
    name_frontend: ClassVar[str] = "Text Reverser"
    utterances: ClassVar[list[str]] = [
        "Reverse this text",
        "Flip the text around",
        "Reverse the word order",
        "Turn this text backwards",
    ]
    description: ClassVar[str] = (
        "Reverses text either character by character or by reversing word order. "
        "Useful for text manipulation and testing."
    )
    description_frontend: ClassVar[str] = """Reverse text in different ways. This tool can:
    • Reverse character order (default): "hello" → "olleh"
    • Reverse word order: "hello world" → "world hello"
    • Handle any text length
    • Preserve original formatting when reversing words

    Choose between character reversal or word order reversal."""
    metadata: TextReverserMetadata
    input_schema: TextReverserInput

    async def arun(self) -> TextReverserToolOutput:
        """Reverse the input text.

        Returns
        -------
            Dictionary containing original text, reversed text, and reverse type
        """
        if self.input_schema.reverse_words:
            # Reverse word order
            words = self.input_schema.text.split()
            reversed_text = " ".join(reversed(words))
            reverse_type = "word_order"
        else:
            # Reverse character order
            reversed_text = self.input_schema.text[::-1]
            reverse_type = "character_order"

        return TextReverserToolOutput(
            original_text=self.input_schema.text,
            reversed_text=reversed_text,
            reverse_type=reverse_type,
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this tool doesn't depend on external services.
        """
        return True