"""Weather tool for getting random weather data."""

import logging
import random
from typing import ClassVar
import asyncio

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


class WeatherTool(BaseTool):
    """Tool that returns random weather data for a given location."""

    name: ClassVar[str] = "weather-tool"
    hil: ClassVar[bool] = True
    description: ClassVar[str] = (
        "Returns weather information for a specified location (temperature in Celsius, "
        "conditions like 'sunny', 'rainy', etc.)"
    )
    input_schema: WeatherInput
    metadata: WeatherMetadata

    async def arun(self) -> dict[str, str | float]:
        """Get random weather data for the specified location.

        Returns
        -------
            Dictionary containing temperature and conditions
        """
        logger.info(f"Getting weather for location: {self.input_schema.location}")

        # Add sleep to simulate API call
        await asyncio.sleep(4)

        conditions = ["sunny", "rainy", "cloudy", "partly cloudy", "stormy"]
        temperature = round(random.uniform(-5, 35), 1)

        return {"temperature": temperature, "conditions": random.choice(conditions)}
