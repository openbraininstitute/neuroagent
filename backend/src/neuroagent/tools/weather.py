"""Weather tool for getting random weather data."""

import asyncio
import logging
import random
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class WeatherInput(BaseModel):
    """Input schema for Weather tool."""

    location: str = Field(
        description="The location (city, country) to get weather information for"
    )


class WeatherMetadata(BaseMetadata):
    """Metadata for Weather tool."""

    pass


class WeatherToolOutput(BaseModel):
    """Output of the weather tool."""

    temperature: float
    conditions: str


class WeatherTool(BaseTool):
    """Tool that returns random weather data for a given location."""

    name: ClassVar[str] = "weather-tool"
    name_frontend: ClassVar[str] = "Weather"
    hil: ClassVar[bool] = True
    utterances: ClassVar[list[str]] = [
        "What's the weather like?",
        "Get weather for this location",
        "Check the weather forecast",
    ]
    description: ClassVar[str] = (
        "Returns weather information for a specified location (temperature in Celsius, "
        "conditions like 'sunny', 'rainy', etc.)"
    )
    description_frontend: ClassVar[
        str
    ] = """Get current weather information for any location. This tool provides:
    • Temperature readings in Celsius
    • Current weather conditions
    • Location-specific weather data

    Simply specify a location to get its current weather information."""
    metadata: WeatherMetadata
    input_schema: WeatherInput

    async def arun(self) -> WeatherToolOutput:
        """Get random weather data for the specified location.

        Returns
        -------
            Dictionary containing temperature and conditions
        """
        logger.info(f"Getting weather for location: {self.input_schema.location}")

        # Add sleep to simulate API call
        await asyncio.sleep(4)

        conditions = ["sunny", "rainy", "cloudy", "partly cloudy", "stormy"]
        temperature = round(random.uniform(-5, 35), 1)  # nosec B311
        return WeatherToolOutput(
            temperature=temperature,
            conditions=random.choice(conditions),  # nosec B311
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this is a mock tool that doesn't depend on external services.
        """
        return True
