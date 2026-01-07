"""Calculator tool for basic math operations."""

import logging
from typing import ClassVar

from pydantic import BaseModel, Field

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

logger = logging.getLogger(__name__)


class CalculatorInput(BaseModel):
    """Input schema for Calculator tool."""

    expression: str = Field(
        description="Mathematical expression to evaluate (e.g., '2 + 3 * 4', '10 / 2', 'sqrt(16)')"
    )


class CalculatorMetadata(BaseMetadata):
    """Metadata for Calculator tool."""

    pass


class CalculatorToolOutput(BaseModel):
    """Output of the calculator tool."""

    result: float
    expression: str


class CalculatorTool(BaseTool):
    """Tool that evaluates basic mathematical expressions."""

    name: ClassVar[str] = "calculator-tool"
    name_frontend: ClassVar[str] = "Calculator"
    utterances: ClassVar[list[str]] = [
        "Calculate this expression",
        "What is 2 + 2?",
        "Solve this math problem",
        "Do the math",
    ]
    description: ClassVar[str] = (
        "Evaluates basic mathematical expressions including addition, subtraction, "
        "multiplication, division, and basic functions like sqrt, sin, cos, etc."
    )
    description_frontend: ClassVar[str] = """Perform mathematical calculations. This tool supports:
    • Basic arithmetic operations (+, -, *, /)
    • Mathematical functions (sqrt, sin, cos, tan, log, etc.)
    • Parentheses for order of operations
    • Constants like pi and e

    Simply provide a mathematical expression to get the result."""
    metadata: CalculatorMetadata
    input_schema: CalculatorInput

    async def arun(self) -> CalculatorToolOutput:
        """Evaluate the mathematical expression.

        Returns
        -------
            Dictionary containing the result and original expression
        """
        import math

        # Safe evaluation with limited scope
        allowed_names = {
            k: v for k, v in math.__dict__.items() if not k.startswith("__")
        }
        allowed_names.update({"abs": abs, "round": round, "min": min, "max": max})

        try:
            result = eval(self.input_schema.expression, {"__builtins__": {}}, allowed_names)
            return CalculatorToolOutput(
                result=float(result), expression=self.input_schema.expression
            )
        except Exception as e:
            raise ValueError(f"Invalid expression: {e}") from e

    @classmethod
    async def is_online(cls) -> bool:
        """Check if the tool is online.

        Always returns True as this tool doesn't depend on external services.
        """
        return True