"""Tests for WasmExecutor."""

import json
import logging
import subprocess
from unittest.mock import Mock, mock_open, patch

import pytest

from neuroagent.task_schemas import ErrorDetail, FailureOutput, SuccessOutput
from neuroagent.tasks.utils import WasmExecutor


class TestWasmExecutor:
    """Tests for WasmExecutor initialization."""

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_init_with_defaults(self, mock_file, mock_tempdir, mock_run):
        """Test initialization with default parameters."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        executor = WasmExecutor(additional_imports=["numpy"])

        assert executor.additional_imports == ["numpy"]
        assert executor.logger is None
        assert executor.deno_path == "deno"
        assert executor.timeout == 60
        assert (
            "--allow-read=./node_modules,./cached_wheels" in executor.deno_permissions
        )
        assert "--node-modules-dir=auto" in executor.deno_permissions
        # Verify package installation happened in constructor
        assert mock_run.call_count == 1

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_init_with_custom_parameters(self, mock_file, mock_tempdir, mock_run):
        """Test initialization with custom parameters."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

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
        # Verify package installation happened in constructor
        assert mock_run.call_count == 1

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_init_installs_packages(self, mock_file, mock_tempdir, mock_run):
        """Test that package installation happens during initialization."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        WasmExecutor(additional_imports=["numpy"])

        # Verify TemporaryDirectory was used
        mock_tempdir.assert_called()
        # Verify the context manager was properly entered and exited
        mock_tempdir_instance.__enter__.assert_called()
        mock_tempdir_instance.__exit__.assert_called()
        mock_file.assert_called()

        # Verify subprocess.run was called (for package installation in __init__)
        assert mock_run.call_count == 1

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_init_cleanup_on_exception(self, mock_file, mock_tempdir, mock_run):
        """Test that TemporaryDirectory cleanup happens even if subprocess fails."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        # Make subprocess.run raise an exception
        mock_run.side_effect = subprocess.TimeoutExpired("deno", 60)

        with pytest.raises(subprocess.TimeoutExpired):
            WasmExecutor(additional_imports=[])

        # Verify TemporaryDirectory cleanup was called even on exception
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_success(self, mock_file, mock_tempdir, mock_run):
        """Test successful code execution."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock successful execution
        mock_stdout_data = (
            "Loading packages...\n"
            + json.dumps(
                {
                    "output": ["Hello, World!"],
                    "return_value": 42,
                    "error": None,
                }
            )
            + "\n"
        )

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout=mock_stdout_data, stderr=""),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[])
        result = executor.run_code_sync("print('Hello, World!')")

        assert isinstance(result, SuccessOutput)
        assert result.status == "success"
        assert result.output == ["Hello, World!"]
        assert result.return_value == 42

        # Verify subprocess.run was called twice (constructor + run_code_sync)
        assert mock_run.call_count == 2

        # Verify TemporaryDirectory cleanup was called
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_python_error(self, mock_file, mock_tempdir, mock_run):
        """Test code execution with Python error."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock execution with Python error
        mock_stdout_data = (
            json.dumps(
                {
                    "output": [],
                    "return_value": None,
                    "error": {
                        "name": "NameError",
                        "message": "name 'undefined_var' is not defined",
                    },
                }
            )
            + "\n"
        )

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout=mock_stdout_data, stderr=""),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[])
        result = executor.run_code_sync("print(undefined_var)")

        assert isinstance(result, FailureOutput)
        assert result.status == "error"
        assert result.error_type == "python-error"
        assert isinstance(result.error, ErrorDetail)
        assert result.error.name == "NameError"

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_install_error(self, mock_file, mock_tempdir, mock_run):
        """Test code execution with installation error."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(
                returncode=0, stdout="", stderr="Failed to load package numpy"
            ),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=["numpy"])
        result = executor.run_code_sync("import numpy")

        assert isinstance(result, FailureOutput)
        assert result.status == "error"
        assert result.error_type == "install-error"
        assert result.error == "Failed to load package numpy"

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_invalid_json_output(self, mock_file, mock_tempdir, mock_run):
        """Test code execution with invalid JSON output."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(
                returncode=0, stdout="invalid json output\n", stderr=""
            ),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError, match="invalid output"):
            executor.run_code_sync("print('test')")

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_no_stdout(self, mock_file, mock_tempdir, mock_run):
        """Test code execution when stdout is empty."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout="", stderr=""),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError, match="Could not retrieve outputs"):
            executor.run_code_sync("print('test')")

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_with_logger(self, mock_file, mock_tempdir, mock_run):
        """Test code execution with logger."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        mock_logger = Mock(spec=logging.Logger)

        # Mock execution with logger
        mock_stdout_data = (
            "Debug line 1\n"
            "Debug line 2\n"
            + json.dumps(
                {
                    "output": ["result"],
                    "return_value": None,
                    "error": None,
                }
            )
            + "\n"
        )

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout=mock_stdout_data, stderr=""),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[], logger=mock_logger)
        result = executor.run_code_sync("print('test')")

        assert isinstance(result, SuccessOutput)
        # Verify logger was called for each line
        assert mock_logger.debug.call_count == 3

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_run_code_cleanup_on_error(self, mock_file, mock_tempdir, mock_run):
        """Test cleanup happens even when execution fails."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout="", stderr=""),  # run_code_sync
        ]

        executor = WasmExecutor(additional_imports=[])

        with pytest.raises(ValueError):
            executor.run_code_sync("print('test')")

        # Verify TemporaryDirectory cleanup was called via __exit__
        mock_tempdir_instance.__exit__.assert_called()

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_no_network_requests_made(self, mock_file, mock_tempdir, mock_run):
        """Test that no actual network requests are made during execution."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance

        # Mock execution with no network requests
        mock_stdout_data = (
            json.dumps(
                {
                    "output": [],
                    "return_value": None,
                    "error": None,
                }
            )
            + "\n"
        )

        # First call is for constructor (package installation), second is for run_code_sync
        mock_run.side_effect = [
            Mock(returncode=0, stdout="", stderr=""),  # Constructor
            Mock(returncode=0, stdout=mock_stdout_data, stderr=""),  # run_code_sync
        ]

        # Test with packages that would normally trigger network requests
        executor = WasmExecutor(additional_imports=["numpy", "pandas", "matplotlib"])
        result = executor.run_code_sync("import numpy")

        assert isinstance(result, SuccessOutput)

        # Verify that subprocess.run was called (subprocess execution)
        # but ensure it's mocked and not making real requests
        assert mock_run.call_count == 2

        # Verify the JavaScript file content contains the packages
        written_content = mock_file().write.call_args[0][0]
        assert "numpy" in written_content
        assert "pandas" in written_content
        assert "matplotlib" in written_content

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_js_code_contains_package_placeholder(
        self, mock_file, mock_tempdir, mock_run
    ):
        """Test JS code template has package placeholder."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        executor = WasmExecutor(additional_imports=["numpy"])

        assert "{packages}" in executor.JS_CODE
        assert "{code}" in executor.JS_CODE

    @patch("subprocess.run")
    @patch("tempfile.TemporaryDirectory")
    @patch("builtins.open", new_callable=mock_open)
    def test_js_code_format(self, mock_file, mock_tempdir, mock_run):
        """Test JS code can be formatted correctly."""
        # Mock TemporaryDirectory context manager
        mock_tempdir_instance = Mock()
        mock_tempdir_instance.__enter__ = Mock(return_value="/tmp/test_dir")
        mock_tempdir_instance.__exit__ = Mock(return_value=None)
        mock_tempdir.return_value = mock_tempdir_instance
        mock_run.return_value = Mock(returncode=0, stdout=b"", stderr=b"")

        executor = WasmExecutor(additional_imports=["numpy", "pandas"])

        formatted = executor.JS_CODE.format(
            packages=["numpy", "pandas"], code=json.dumps("print('test')")
        )

        assert "numpy" in formatted
        assert "pandas" in formatted
        assert "print('test')" in formatted
