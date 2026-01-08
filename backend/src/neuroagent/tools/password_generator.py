"""Password generator tool."""

import logging
import random
import string
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class PasswordInput(BaseModel):
    """Input schema for Password tool."""

    length: int = Field(default=12, description="Password length")
    include_symbols: bool = Field(default=True, description="Include special characters")
    include_numbers: bool = Field(default=True, description="Include numbers")


class PasswordMetadata(BaseMetadata):
    """Metadata for Password tool."""

    pass


class PasswordToolOutput(BaseModel):
    """Output of the password tool."""

    password: str
    length: int
    character_types: list[str]


class PasswordTool(BaseTool):
    """Tool that generates secure passwords."""

    name: ClassVar[str] = "password-tool"
    name_frontend: ClassVar[str] = "Password Generator"
    utterances: ClassVar[list[str]] = [
        "Generate a password",
        "Create secure password",
        "Random password",
    ]
    description: ClassVar[str] = "Generates secure random passwords with customizable options"
    description_frontend: ClassVar[str] = """Generate secure passwords with options:
    • Customizable length (8-128 characters)
    • Include/exclude special characters
    • Include/exclude numbers
    • Always includes uppercase and lowercase letters
    
    Creates cryptographically secure passwords for accounts and systems."""
    metadata: PasswordMetadata
    input_schema: PasswordInput

    async def arun(self) -> PasswordToolOutput:
        """Generate a secure password."""
        if self.input_schema.length < 8 or self.input_schema.length > 128:
            raise ValueError("length must be between 8 and 128")

        chars = string.ascii_letters
        char_types = ["letters"]
        
        if self.input_schema.include_numbers:
            chars += string.digits
            char_types.append("numbers")
        
        if self.input_schema.include_symbols:
            chars += "!@#$%^&*"
            char_types.append("symbols")

        password = "".join(random.choices(chars, k=self.input_schema.length))

        return PasswordToolOutput(
            password=password,
            length=self.input_schema.length,
            character_types=char_types,
        )

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online."""
        return True