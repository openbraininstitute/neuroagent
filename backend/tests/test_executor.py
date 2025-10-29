"""Tests for WasmExecutor."""

import json
import logging
from unittest.mock import AsyncMock, Mock, mock_open, patch

import pytest

from neuroagent.executor import (
    ErrorDetail,
    FailureOutput,
    SuccessOutput,
    WasmExecutor,
)


class TestWasmExecutor:
    """Tests for WasmExecutor initialization."""

    def test_init_with_defaults(self):
        """Test initialization with default parameters."""
        executor = WasmExecutor(additional_imports=["numpy"])

        assert executor.additional_imports == ["numpy"]
        assert executor.logger is None
        assert executor.deno_path == "deno"
        assert executor.timeout == 60
        assert (
            "--allow-read=./node_modules,./cached_wheels" in executor.deno_permissions
        )
        assert "--node-modules-dir=auto" in executor.deno_permissions

    def test_init_with_custom_parameters(self):
        """Test initialization with custom parameters."""
        logger = logging.getLogger("test")
        custom_permissions = ["allow-net", "allow-read"]

        executor = WasmExecutor(
            additional_imports=["pandas", "matplotlib"],
            logger=logger,
            deno_path="/usr/local/bin/deno",
            deno_permissions=custom_permissions,
            timeout=120,
        )

        assert executor.additional_imports == ["pandas", "matplotlib"]
        assert executor.logger == logger
        assert executor.deno_path == "/usr/local/bin/deno"
        assert executor.timeout == 120
        assert executor.deno_permissions == ["--allow-net", "--allow-read"]

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_context_manager_enter_exit(self, mock_file, mock_tempdir, mock_run):
        """Test context manager enters and exits correctly."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        executor = WasmExecutor(additional_imports=["numpy"])

        with executor as exec_instance:
            assert exec_instance is executor
            mock_file.assert_called()

        # Verify TemporaryDirectory was used
        mock_tempdir.assert_called()
        # Verify the context manager was properly entered and exited
        mock_tempdir_instance.__enter__.assert_called()
        mock_tempdir_instance.__exit__.assert_called()

        # Verify subprocess.run was called (for package installation in __enter__)
        assert mock_run.call_count == 1

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_context_manager_cleanup_on_exception(
        self, mock_file, mock_tempdir, mock_run
    ):
        """Test context manager cleans up even on exception."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError):
            with executor:
                raise ValueError("Test error")

        # Verify TemporaryDirectory cleanup was called via __exit__
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_success(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test successful code execution."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = [
            "Loading packages...".encode(),
            json.dumps(
                {
                    "output": ["Hello, World!"],
                    "return_value": 42,
                    "error": None,
                }
            ).encode(),
        ]

        # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines) + b"\n"

        # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read

        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")

        # Make the patched create_subprocess_exec return our mock_process
        mock_process = AsyncMock()
        mock_process.stderr = mock_stderr
        mock_process.stdout = mock_stdout
        mock_process.wait = AsyncMock(return_value=None)

        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=[])
        result = await executor.run_code("print('Hello, World!')")

        assert isinstance(result, SuccessOutput)
        assert result.status == "success"
        assert result.output == ["Hello, World!"]
        assert result.return_value == 42

        # Verify Popen was called with correct structure
        mock_create_subproc_exec.assert_called_once()
        call_args = mock_create_subproc_exec.call_args[0]
        assert call_args[0] == "deno"
        assert call_args[1] == "run"

        # Verify TemporaryDirectory cleanup was called
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_python_error(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test code execution with Python error."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = [
            json.dumps(
                {
                    "output": [],
                    "return_value": None,
                    "error": {
                        "name": "NameError",
                        "message": "name 'undefined_var' is not defined",
                    },
                }
            ).encode(),
        ]

        # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines) + b"\n"

        # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read

        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")

        # Make the patched create_subprocess_exec return our mock_process
        mock_process = AsyncMock()
        mock_process.stderr = mock_stderr
        mock_process.stdout = mock_stdout
        mock_process.wait = AsyncMock(return_value=None)

        mock_create_subproc_exec.return_value = mock_process
        executor = WasmExecutor(additional_imports=[])
        result = await executor.run_code("print(undefined_var)")

        assert isinstance(result, FailureOutput)
        assert result.status == "error"
        assert result.error_type == "python-error"
        assert isinstance(result.error, ErrorDetail)
        assert result.error.name == "NameError"

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_install_error(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test code execution with installation error."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = []

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines) + b"\n"

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read

        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        mock_stderr.read = AsyncMock(
            return_value="Failed to load package numpy".encode()
        )

        # Make the patched create_subprocess_exec return our mock_process
        mock_process = AsyncMock()
        mock_process.stderr = mock_stderr
        mock_process.stdout = mock_stdout
        mock_process.wait = AsyncMock(return_value=None)

        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=["numpy"])
        result = await executor.run_code("import numpy")

        assert isinstance(result, FailureOutput)
        assert result.status == "error"
        assert result.error_type == "install-error"
        assert result.error == "Failed to load package numpy"

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_invalid_json_output(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test code execution with invalid JSON output."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock execution with invalid JSON
        # Mock successful execution
        mock_stdout_lines = ["invalid json output".encode()]

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines) + b"\n"

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read
        mock_process = AsyncMock()
        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        mock_process.wait = AsyncMock(return_value=None)
        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError, match="invalid output"):
            await executor.run_code("print('test')")

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_no_stdout(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test code execution when stdout is None."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = []

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines)

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read
        mock_process = AsyncMock()
        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        mock_process.wait = AsyncMock(return_value=None)
        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError, match="Could not retrieve outputs"):
            await executor.run_code("print('test')")

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_with_logger(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test code execution with logger."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        mock_logger = Mock(spec=logging.Logger)

        # Mock successful execution
        mock_stdout_lines = [
            "Debug line 1".encode(),
            "Debug line 2".encode(),
            json.dumps(
                {
                    "output": ["result"],
                    "return_value": None,
                    "error": None,
                }
            ).encode(),
        ]

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines)

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read
        mock_process = AsyncMock()
        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        mock_process.wait = AsyncMock(return_value=None)
        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=[], logger=mock_logger)
        result = await executor.run_code("print('test')")

        assert isinstance(result, SuccessOutput)
        # Verify logger was called for each line
        assert mock_logger.debug.call_count == 3

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_run_code_cleanup_on_error(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test cleanup happens even when execution fails."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = []

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines)

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read
        mock_process = AsyncMock()
        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        mock_process.wait = AsyncMock(return_value=None)
        mock_create_subproc_exec.return_value = mock_process

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError):
            await executor.run_code("print('test')")

        # Verify TemporaryDirectory cleanup was called via __exit__
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("asyncio.create_subprocess_exec")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    @pytest.mark.asyncio
    async def test_no_network_requests_made(
        self, mock_file, mock_tempdir, mock_create_subproc_exec, mock_run
    ):
        """Test that no actual network requests are made during execution."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_lines = [
            json.dumps(
                {
                    "output": [],
                    "return_value": None,
                    "error": None,
                }
            ).encode(),
        ]

        # # Simulate the read() method returning chunks
        mock_stdout_data = b"\n".join(mock_stdout_lines)

        # # Create an iterator that returns chunks
        chunks = [
            mock_stdout_data[i : i + 4096]
            for i in range(0, len(mock_stdout_data), 4096)
        ]
        chunk_iter = iter(chunks + [b""])  # Add empty bytes at the end for EOF

        async def mock_read(size):
            """Mock read that returns data in chunks"""
            return next(chunk_iter)

        mock_stdout = Mock()
        mock_stdout.read = mock_read
        mock_process = AsyncMock()
        # Configure stderr.read to return empty bytes/string
        mock_stderr = Mock()
        # emulate an async read method that returns empty bytes
        mock_stderr.read = AsyncMock(return_value=b"")
        mock_process.stdout = mock_stdout
        mock_process.stderr = mock_stderr
        mock_process.wait = AsyncMock(return_value=None)
        mock_create_subproc_exec.return_value = mock_process

        # Test with packages that would normally trigger network requests
        executor = WasmExecutor(additional_imports=["numpy", "pandas", "matplotlib"])
        result = await executor.run_code("import numpy")

        assert isinstance(result, SuccessOutput)

        # Verify that Popen was called (subprocess execution)
        # but ensure it's mocked and not making real requests
        mock_create_subproc_exec.assert_called_once()

        # Verify the JavaScript file content contains the packages
        written_content = mock_file().write.call_args[0][0]
        assert "numpy" in written_content
        assert "pandas" in written_content
        assert "matplotlib" in written_content

    def test_js_code_contains_package_placeholder(self):
        """Test JS code template has package placeholder."""
        executor = WasmExecutor(additional_imports=["numpy"])

        assert "{packages}" in executor.JS_CODE
        assert "{code}" in executor.JS_CODE

    def test_js_code_format(self):
        """Test JS code can be formatted correctly."""
        executor = WasmExecutor(additional_imports=["numpy", "pandas"])

        formatted = executor.JS_CODE.format(
            packages=["numpy", "pandas"], code=json.dumps("print('test')")
        )

        assert "numpy" in formatted
        assert "pandas" in formatted
        assert "print('test')" in formatted
