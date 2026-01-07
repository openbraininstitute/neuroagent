"""Random number generator tool."""

import logging
import random
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class RandomNumberInput(BaseModel):
    """Input schema for Random Number tool."""

    min_value: int = Field(default=1, description="Minimum value (inclusive)")
    max_value: int = Field(default=100, description="Maximum value (inclusive)")
    count: int = Field(default=1, description="Number of random numbers to generate")


class RandomNumberMetadata(BaseMetadata):
    """Metadata for Random Number tool."""

    pass


class RandomNumberToolOutput(BaseModel):
    """Output of the random number tool."""

    numbers: list[int]
    min_value: int
    max_value: int


class RandomNumberTool(BaseTool):
    """Tool that generates random numbers within a specified range."""

    name: ClassVar[str] = "random-number-tool"
    name_frontend: ClassVar[str] = "Random Number Generator"
    utterances: ClassVar[list[str]] = [
        "Generate a random number",
        "Pick a random number between 1 and 10",
        "Give me some random numbers",
        "Random number generator",
    ]
    description: ClassVar[str] = (
        "Generates random integers within a specified range. "
        "Can generate single or multiple random numbers."
    )
    description_frontend: ClassVar[str] = """Generate random numbers within any range. This tool provides:
    • Single or multiple random numbers
    • Customizable min and max values
    • Integer output only
    • Uniform distribution

    Specify the range and count to get your random numbers."""
    metadata: RandomNumberMetadata
    input_schema: RandomNumberInput

    async def arun(self) -> RandomNumberToolOutput:
        """Generate random numbers within the specified range.

        Returns
        -------
            Dictionary containing the generated numbers and range info
        """
        if self.input_schema.min_value > self.input_schema.max_value:
            raise ValueError("min_value must be less than or equal to max_value")
        
        if self.input_schema.count < 1:
            raise ValueError("count must be at least 1")
        
        if self.input_schema.count > 1000:
            raise ValueError("count cannot exceed 1000")

        numbers = [
            random.randint(self.input_schema.min_value, self.input_schema.max_value)
            for _ in range(self.input_schema.count)
        ]

        return RandomNumberToolOutput(
            numbers=numbers,
            min_value=self.input_schema.min_value,
            max_value=self.input_schema.max_value,
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this tool doesn't depend on external services.
        """
        return True