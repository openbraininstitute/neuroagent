"""Test app utils."""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.exceptions import HTTPException

from neuroagent.app.app_utils import setup_engine, validate_project
from neuroagent.app.config import Settings


@pytest.mark.asyncio
async def test_validate_project():
    vlab_id = "test_vlab"
    proj_id = "test_project"
    groups = [
        "/proj/test_vlab/test_project/admin",
        "/proj/test_vlab2/test_project2/member",
        "/vlab/test_vlab/admin",
        "/vlab/test_vlab2/member",
    ]
    # Don't specify anything
    validate_project(groups=groups)

    # Specify correct vlab + proj
    validate_project(virtual_lab_id=vlab_id, project_id=proj_id, groups=groups)

    # Specify only the correct vlab
    validate_project(virtual_lab_id=vlab_id, groups=groups)

    # Specify only the project
    with pytest.raises(HTTPException):
        validate_project(project_id=proj_id, groups=groups)

    # Specify wrong vlab correct proj
    with pytest.raises(HTTPException):
        validate_project(virtual_lab_id="wrong_vlab", project_id=proj_id, groups=groups)

    # Specify correct vlab wrong project
    with pytest.raises(HTTPException):
        validate_project(
            virtual_lab_id=vlab_id, project_id="wrong_project", groups=groups
        )

    # Specify wrong vlab wrong project
    with pytest.raises(HTTPException):
        validate_project(
            virtual_lab_id="wrong_vlab", project_id="wrong_project", groups=groups
        )


@patch("neuroagent.app.app_utils.create_async_engine")
def test_setup_engine(create_engine_mock, monkeypatch, patch_required_env):
    create_engine_mock.return_value = AsyncMock()

    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "prefix")

    settings = Settings()

    connection_string = "postgresql+asyncpg://user:password@localhost/dbname"
    retval = setup_engine(settings=settings, connection_string=connection_string)
    assert retval is not None


@patch("neuroagent.app.app_utils.create_async_engine")
def test_setup_engine_no_connection_string(
    create_engine_mock, monkeypatch, patch_required_env
):
    create_engine_mock.return_value = AsyncMock()

    monkeypatch.setenv("NEUROAGENT_DB__PREFIX", "prefix")

    settings = Settings()

    retval = setup_engine(settings=settings, connection_string=None)
    assert retval is None
