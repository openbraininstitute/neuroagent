"""Sandboxed python executor."""

import json
import logging
import os
import shutil
import subprocess  # nosec: B404
import tempfile
from textwrap import dedent
from types import TracebackType
from typing import Any, Literal

from pydantic import BaseModel

LoggingLevel = Literal[
    "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
]


class SuccessOutput(BaseModel):
    """Output of the python script."""

    status: Literal["success"] = "success"
    output: list[str]
    return_value: Any = None


class ErrorDetail(BaseModel):
    """Detail fo the python error."""

    message: str | None = None
    name: str | None = None


class FailureOutput(BaseModel):
    """Output of the python script."""

    status: Literal["error"] = "error"
    error_type: Literal["install-error", "python-error"]
    error: ErrorDetail | str | None = None


class WasmExecutor:
    """
    Remote Python code executor in a sandboxed WebAssembly environment powered by Pyodide and Deno.

    This executor combines Deno's secure runtime with Pyodide's WebAssembly‑compiled Python interpreter to deliver
    strong isolation guarantees while enabling full Python execution.

    Args:
        additional_imports (`list[str]`): Additional Python packages to install in the Pyodide environment.
        logger (`Logger`): Logger to log installation steps.
        deno_path (`str`, optional): Path to the Deno executable. If not provided, will use "deno" from PATH.
        deno_permissions (`list[str]`, optional): List of permissions to grant to the Deno runtime.
            Default is minimal permissions needed for execution.
        timeout (`int`, optional): Timeout in seconds for code execution. Default is 60 seconds.
    """

    def __init__(
        self,
        additional_imports: list[str],
        logger: logging.Logger | None = None,
        deno_path: str = "deno",
        deno_permissions: list[str] | None = None,
        timeout: int = 60,
    ):
        self.additional_imports = additional_imports
        self.logger = logger

        # Check if Deno is installed
        try:
            subprocess.run([deno_path, "--version"], capture_output=True, check=True)  # nosec: B603
        except (subprocess.SubprocessError, FileNotFoundError):
            raise RuntimeError(
                "Deno is not installed or not found in PATH. Please install Deno from https://deno.land/"
            )

        self.deno_path = deno_path
        self.timeout = timeout

        # Default minimal permissions needed
        if deno_permissions is None:
            # Use minimal permissions for Deno execution
            deno_permissions = [
                "allow-read=./node_modules",
                "node-modules-dir=auto",
            ]
        self.deno_permissions = [f"--{perm}" for perm in deno_permissions]

    def __enter__(self) -> "WasmExecutor":
        """Install provided dependencies. Use the class as a context manager to cache the wheels.

        Only built-in pyodide packages are downloaded and cached, PyPi wheels need to be manually downloaded and added to the
        ./node_modules/pyodide folder if you plan running without net access.
        Built in pyodide packages can be references as the package name,
        while pure python 3 wheels from PyPi that have been manually added must be referenced through micropip's reference mechanism:
        file:/path/to/the/wheel.whl.
        Example:
        ```python
            with WasmExecutor(additional_imports=["numpy", "file:/path/to/plotly-wheel.wlh"]) as executor:
                code = \"""import plotly; print('Hello world')\"""
                executed = executor.run_code(code)
        ```
        The example assumes I have manually downloaded the plotly wheel and put it in the forlder /path/to/plotly-wheel.wlh
        """  # noqa: D300
        self.runner_dir = tempfile.mkdtemp(prefix="pyodide_deno_")
        self.runner_path = os.path.join(self.runner_dir, "pyodide_runner.js")
        deno_permissions = [  # Allow fetching + caching packages
            "allow-net="
            + ",".join(
                [
                    "cdn.jsdelivr.net:443",  # allow loading pyodide packages
                    "pypi.org:443,files.pythonhosted.org:443",  # allow pyodide install packages from PyPI
                ]
            ),
            "allow-read=./node_modules",
            "allow-write=./node_modules",
            "node-modules-dir=auto",
        ]
        try:
            # Create the JavaScript runner file
            with open(self.runner_path, "w") as f:
                f.write(
                    self.JS_CODE.format(
                        packages=self.additional_imports, code=json.dumps("")
                    )
                )  # Empty code

            cmd = (
                [self.deno_path, "run"]
                + [f"--{perm}" for perm in deno_permissions]
                + [self.runner_path]
            )

            # Start the server process
            subprocess.run(  # nosec: B603
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=self.timeout,
            )
            return self
        finally:
            # Cleanup temp dir
            if hasattr(self, "runner_dir") and os.path.exists(self.runner_dir):
                shutil.rmtree(self.runner_dir)

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> Literal[False]:
        """Exit context manager."""
        if hasattr(self, "runner_dir") and os.path.exists(self.runner_dir):
            shutil.rmtree(self.runner_dir)
        return False

    def run_code(self, code: str) -> SuccessOutput | FailureOutput:
        """
        Execute Python code in the Pyodide environment and return the result.

        Args:
            code (`str`): Python code to execute.

        Returns
        -------
            `CodeOutput`: Code output containing the result, logs, and whether it is the final answer.
        """
        self.runner_dir = tempfile.mkdtemp(prefix="pyodide_deno_")
        self.runner_path = os.path.join(self.runner_dir, "pyodide_runner.js")
        try:
            # Create the JavaScript runner file
            with open(self.runner_path, "w") as f:
                f.write(
                    self.JS_CODE.format(
                        packages=self.additional_imports, code=json.dumps(code)
                    )
                )

            cmd = [self.deno_path, "run"] + self.deno_permissions + [self.runner_path]

            # Start the server process
            process = subprocess.Popen(  # nosec: B603
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )

            # Process the result
            # Check for execution errors
            events = []
            if process.stdout:
                for line in process.stdout:
                    events.append(line.strip())
                    if self.logger:
                        # Funnel the logging to your logger as a debug log.
                        self.logger.debug(line)
                process.wait(timeout=self.timeout)
            else:
                raise ValueError("Could not retrieve outputs of the python script.")

            if process.stderr:
                return FailureOutput(
                    error_type="install-error", error=process.stderr.read()
                )

            python_outcome = events[-1]  # Last line of the js logs is the python output
            try:
                result_json = json.loads(python_outcome)
            except json.JSONDecodeError:
                raise ValueError(
                    f"The code returned an invalid output: {python_outcome}"
                )

            if result_json["error"]:
                return FailureOutput(
                    error_type="python-error", error=ErrorDetail(**result_json["error"])
                )

            return SuccessOutput(
                output=result_json["output"],
                return_value=result_json.get("return_value"),
            )
        finally:
            # Cleanup temp dir
            if hasattr(self, "runner_dir") and os.path.exists(self.runner_dir):
                shutil.rmtree(self.runner_dir)

    JS_CODE = dedent("""\
// pyodide_runner.js - Runs Python code in Pyodide within Deno
import {{ loadPyodide }} from "npm:pyodide";

// Initialize Pyodide instance
const pyodidePromise = loadPyodide();
const packages = {packages} // first variable

// Load any requested packages
if (packages && packages.length > 0) {{
    const pyodide = await pyodidePromise;
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    try {{
        await micropip.install(packages);
    }} catch (e) {{
        console.error(`Failed to load package ${{packages}}: ${{e.message}}`);
    }}
}}

// Function to execute Python code and return the result
async function execute(code) {{
  const pyodide = await pyodidePromise;

  // Create a capture for stdout
  pyodide.runPython(`
    import sys
    import io
    sys.stdout = io.StringIO()
  `);

  // Execute the code and capture any errors
  let return_value = null;
  let error = null;
  let output = "";

  try {{
    // Execute the code
    return_value = await pyodide.runPythonAsync(code);
    console.log(return_value)

    // Get captured stdout
    output = pyodide.runPython("sys.stdout.getvalue().splitlines()");
  }} catch (e) {{
    error = {{
      name: e.constructor.name,
      message: e.message,
      stack: e.stack
    }};

    // Extract Python exception details
    if (e.constructor.name === "PythonError") {{
      // Get the Python exception type from the error message: at the end of the traceback
      const errorMatch = e.message.match(/\\n([^:]+Exception): /);
      if (errorMatch) {{
        error.pythonExceptionType = errorMatch[1].split(".").pop();
      }}

      // If the error is a FinalAnswerException, extract its encoded value
      if (error.pythonExceptionType === "FinalAnswerException") {{
        // Extract the base64 encoded value from the error message
        const valueMatch = e.message.match(/FinalAnswerException: (.*?)(?:\\n|$)/);
        if (valueMatch) {{
          error.pythonExceptionValue = valueMatch[1];
        }}
      }}
    }}
  }}

  return {{
    return_value,
    output,
    error
  }};
}}

const result = await execute({code});
console.log(JSON.stringify(result));
""")
