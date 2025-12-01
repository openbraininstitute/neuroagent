"""Sandboxed python executor."""

import asyncio
import json
import logging
import subprocess  # nosec: B404
import tempfile
from pathlib import Path
from textwrap import dedent
from types import TracebackType
from typing import Literal

from neuroagent.task_schemas import ErrorDetail, FailureOutput, SuccessOutput

LoggingLevel = Literal[
    "debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"
]


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
        allocated_memory: int | None = None,
        timeout: int = 60,
    ) -> None:
        """Init."""
        self.additional_imports = additional_imports
        self.logger = logger
        self.deno_path = deno_path
        self.timeout = timeout

        # Default minimal permissions needed
        if deno_permissions is None:
            # Use minimal permissions for Deno execution
            deno_permissions = [
                "allow-read=./node_modules,./cached_wheels",
                "node-modules-dir=auto",
                "allow-env=WS_NO_BUFFER_UTIL",
            ]
        self.deno_permissions = [f"--{perm}" for perm in deno_permissions]
        if allocated_memory:
            self.deno_permissions.append(
                f"--v8-flags=--max-old-space-size={allocated_memory}"
            )

    def __enter__(self) -> "WasmExecutor":
        """Install provided dependencies. Use the class as a context manager to cache the wheels.

        Only built-in pyodide packages (see https://pyodide.org/en/stable/usage/packages-in-pyodide.html) are downloaded and cached.
        PyPi wheels need to be manually downloaded and added to the `./cached_wheels` folder if you plan running without net access.
        With net access, no need for manual download. Built in pyodide packages can be references by package name.
        Pure python 3 wheels from PyPi that have been manually added must be referenced through micropip's reference mechanism:
        "file:/path/to/the/wheel.whl."
        Example:
        ```python
        import asyncio

        with WasmExecutor(additional_imports=["numpy", "file:./cached_wheels/plotly-wheel.wlh"]) as executor:
            code = \"""import plotly; print('Hello world')\"""
            executed = asyncio.run(executor.run_code(code))
        ```
        The example assumes the plotly wheel has been manually downloaded and put it in the folder ./cached_wheels/plotly-wheel.wlh
        """  # noqa: D300
        with tempfile.TemporaryDirectory(prefix="pyodide_deno_") as runner_dir:
            runner_path = Path(runner_dir) / "pyodide_runner.js"
            deno_permissions = [  # Allow fetching + caching packages
                "allow-net="
                + ",".join(
                    [
                        "cdn.jsdelivr.net:443",  # allow loading pyodide packages
                        "pypi.org:443,files.pythonhosted.org:443",  # allow pyodide install packages from PyPI
                    ]
                ),
                "allow-read=./node_modules,./cached_wheels",
                "allow-write=./node_modules",
                "node-modules-dir=auto",
            ]
            # Create the JavaScript runner file
            with open(runner_path, "w") as f:
                f.write(
                    self.JS_CODE.format(
                        packages=self.additional_imports, code=json.dumps("")
                    )
                )  # Empty code

            cmd = (
                [self.deno_path, "run"]
                + [f"--{perm}" for perm in deno_permissions]
                + [runner_path]
            )

            # Run the cmd in a subprocess
            subprocess.run(  # nosec: B603
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=self.timeout,
            )
            return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> Literal[False]:
        """Exit context manager."""
        return False

    async def run_code(self, code: str) -> SuccessOutput | FailureOutput:
        """
        Execute Python code in the Pyodide environment and return the result.

        Parameters
        ----------
            code (`str`): Python code to execute.

        Returns
        -------
            `SuccessOutput | FailureOutput`: Code output containing the result and logs or potential errors.
        """
        with tempfile.TemporaryDirectory(prefix="pyodide_deno_") as runner_dir:
            runner_path = Path(runner_dir) / "pyodide_runner.js"
            # Create the JavaScript runner file
            with open(runner_path, "w") as f:
                f.write(
                    self.JS_CODE.format(
                        packages=self.additional_imports, code=json.dumps(code)
                    )
                )
            # Add read permission to tempdir
            permission = []
            for perm in self.deno_permissions:
                if "--allow-read" in perm:
                    allowed_read_dir = perm.split("=")[-1].split(",")
                    allowed_read_dir.append(runner_dir)
                    permission.append(f"--allow-read={','.join(allowed_read_dir)}")
                else:
                    permission.append(perm)

            cmd = [self.deno_path, "run"] + permission + [runner_path]

            # Run the cmd in a subprocess
            process = await asyncio.create_subprocess_exec(  # nosec: B603
                *cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            # Use communicate() to wait for process and read all output
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=self.timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                raise

            # Check for execution errors
            if stderr:
                return FailureOutput(error_type="install-error", error=stderr.decode())

            # Parse stdout into lines
            events = []
            if stdout:
                lines = stdout.decode().split("\n")
                for line in lines:
                    text = line.rstrip("\r")
                    if text:  # Skip empty lines
                        events.append(text)
                        if self.logger:
                            self.logger.debug(text)

            # No error + no stdout = Houston we have a problem
            if not events:
                raise ValueError("Could not retrieve outputs of the python script.")

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

    def run_code_sync(self, code: str) -> SuccessOutput | FailureOutput:
        """
        Execute Python code in the Pyodide environment and return the result (synchronous version).

        Parameters
        ----------
            code (`str`): Python code to execute.

        Returns
        -------
            `SuccessOutput | FailureOutput`: Code output containing the result and logs or potential errors.
        """
        with tempfile.TemporaryDirectory(prefix="pyodide_deno_") as runner_dir:
            runner_path = Path(runner_dir) / "pyodide_runner.js"
            # Create the JavaScript runner file
            with open(runner_path, "w") as f:
                f.write(
                    self.JS_CODE.format(
                        packages=self.additional_imports, code=json.dumps(code)
                    )
                )
            # Add read permission to tempdir
            permission = []
            for perm in self.deno_permissions:
                if "--allow-read" in perm:
                    allowed_read_dir = perm.split("=")[-1].split(",")
                    allowed_read_dir.append(runner_dir)
                    permission.append(f"--allow-read={','.join(allowed_read_dir)}")
                else:
                    permission.append(perm)

            cmd = [self.deno_path, "run"] + permission + [runner_path]

            # Run the cmd in a subprocess (synchronous)
            try:
                result = subprocess.run(  # nosec: B603
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=self.timeout,
                )
            except subprocess.TimeoutExpired:
                raise ValueError(
                    f"Code execution timed out after {self.timeout} seconds"
                )

            # Check for execution errors
            if result.stderr:
                return FailureOutput(error_type="install-error", error=result.stderr)

            # Parse stdout into lines
            events = []
            if result.stdout:
                lines = result.stdout.split("\n")
                for line in lines:
                    text = line.rstrip("\r")
                    if text:  # Skip empty lines
                        events.append(text)
                        if self.logger:
                            self.logger.debug(text)

            # No error + no stdout = Houston we have a problem
            if not events:
                raise ValueError("Could not retrieve outputs of the python script.")

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
    import plotly.io as pio
    import warnings

    sys.stdout = io.StringIO()
    pio.renderers.default = None
    warnings.filterwarnings("ignore")
  `);

  // Execute the code and capture any errors
  let return_value = null;
  let error = null;
  let output = "";

  try {{
    // Execute the code
    return_value = await pyodide.runPythonAsync(code);

    // For now this code is ran everytime.
    // Feel free to protest if you think it
    // should conditionally run.
    // Grab figures if present.
    pyodide.runPython(`
    import gc
    import json

    import plotly.graph_objects as go

    # Use garbage collector to find all Figure objects in memory
    figures = [obj for obj in gc.get_objects() if isinstance(obj, go.Figure)]

    # Serialize all figures
    if figures:
        serialized = {{"_plots": [fig.to_json() for fig in figures]}}
        print(json.dumps(serialized, separators=(",", ":")))
    `)

    // Try to mitigate issues related to js proxies being destroyed immediately
    if (return_value && typeof return_value.toJs === "function") {{
    try {{
        // Convert the PyProxy into a plain JS structure
        const jsValue = return_value.toJs({{ dicts: true }});
        // destroy the proxy to avoid memory leak
        return_value.destroy?.();
        return_value = jsValue;
    }} catch (e) {{
        return_value = null
    }}
    }}
    // Get captured stdout
    const stdout_json = pyodide.runPython("import json;json.dumps(sys.stdout.getvalue().splitlines())");
    try {{
    output = JSON.parse(stdout_json);
    }} catch (e) {{
    // fallback to raw string
    output = [pyodide.runPython("sys.stdout.getvalue().splitlines()")];
    }}
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
