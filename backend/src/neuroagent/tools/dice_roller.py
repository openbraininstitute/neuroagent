"""Dice roller tool."""

import logging
import random
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class DiceInput(BaseModel):
    """Input schema for Dice tool."""

    sides: int = Field(default=6, description="Number of sides on the dice")
    count: int = Field(default=1, description="Number of dice to roll")


class DiceMetadata(BaseMetadata):
    """Metadata for Dice tool."""

    pass


class DiceToolOutput(BaseModel):
    """Output of the dice tool."""

    rolls: list[int]
    total: int
    sides: int


class DiceTool(BaseTool):
    """Tool that rolls dice."""

    name: ClassVar[str] = "dice-tool"
    name_frontend: ClassVar[str] = "Dice Roller"
    utterances: ClassVar[list[str]] = [
        "Roll a dice",
        "Roll the dice",
        "Random dice roll",
    ]
    description: ClassVar[str] = "Rolls dice with customizable number of sides and count"
    description_frontend: ClassVar[str] = """Roll dice with various configurations:
    • Standard 6-sided dice (default)
    • Custom sided dice (4, 8, 10, 12, 20, etc.)
    • Multiple dice at once
    • Shows individual rolls and total
    
    Great for games, random decisions, or probability experiments."""
    metadata: DiceMetadata
    input_schema: DiceInput

    async def arun(self) -> DiceToolOutput:
        """Roll dice."""
        if self.input_schema.sides < 2 or self.input_schema.sides > 100:
            raise ValueError("sides must be between 2 and 100")
        
        if self.input_schema.count < 1 or self.input_schema.count > 20:
            raise ValueError("count must be between 1 and 20")

        rolls = [random.randint(1, self.input_schema.sides) for _ in range(self.input_schema.count)]

        return DiceToolOutput(
            rolls=rolls,
            total=sum(rolls),
            sides=self.input_schema.sides,
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True