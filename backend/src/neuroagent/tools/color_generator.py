"""Color generator tool."""

import logging
import random
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class ColorInput(BaseModel):
    """Input schema for Color tool."""

    format_type: str = Field(default="hex", description="Color format: hex, rgb, or hsl")
    count: int = Field(default=1, description="Number of colors to generate")


class ColorMetadata(BaseMetadata):
    """Metadata for Color tool."""

    pass


class ColorToolOutput(BaseModel):
    """Output of the color tool."""

    colors: list[str]
    format_type: str


class ColorTool(BaseTool):
    """Tool that generates random colors."""

    name: ClassVar[str] = "color-tool"
    name_frontend: ClassVar[str] = "Color Generator"
    utterances: ClassVar[list[str]] = [
        "Generate a random color",
        "Pick a color",
        "Random color generator",
    ]
    description: ClassVar[str] = "Generates random colors in hex, RGB, or HSL format"
    description_frontend: ClassVar[str] = """Generate random colors in different formats:
    • Hex format: #FF5733
    • RGB format: rgb(255, 87, 51)
    • HSL format: hsl(9, 100%, 60%)
    
    Perfect for design, testing, or creative projects."""
    metadata: ColorMetadata
    input_schema: ColorInput

    async def arun(self) -> ColorToolOutput:
        """Generate random colors."""
        if self.input_schema.count < 1 or self.input_schema.count > 50:
            raise ValueError("count must be between 1 and 50")

        colors = []
        for _ in range(self.input_schema.count):
            r, g, b = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)
            
            if self.input_schema.format_type == "hex":
                colors.append(f"#{r:02x}{g:02x}{b:02x}")
            elif self.input_schema.format_type == "rgb":
                colors.append(f"rgb({r}, {g}, {b})")
            elif self.input_schema.format_type == "hsl":
                h = random.randint(0, 360)
                s = random.randint(0, 100)
                l = random.randint(20, 80)
                colors.append(f"hsl({h}, {s}%, {l}%)")
            else:
                raise ValueError("format_type must be hex, rgb, or hsl")

        return ColorToolOutput(colors=colors, format_type=self.input_schema.format_type)

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True