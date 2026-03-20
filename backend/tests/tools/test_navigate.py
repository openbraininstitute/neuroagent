"""Tests for the Navigate tool."""

from uuid import uuid4

import pytest
from pydantic import ValidationError

from neuroagent.tools.navigate import (
    _BUILD_CONFIGURE_TYPES,
    _BUILD_NEW_TYPES,
    _ENTITY_TYPE_SECTIONS,
    _ENTITY_TYPE_TO_GROUP,
    _SIMULATE_CONFIGURE_TYPES,
    _SIMULATE_NEW_TYPES,
    NavigateInput,
    NavigateMetadata,
    NavigateOutput,
    NavigateTool,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

BASE_URL = "https://bbp.epfl.ch"
VLAB_ID = str(uuid4())
PROJECT_ID = str(uuid4())
FRONTEND_URL = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/home"
PREFIX = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}"
ENTITY_ID = uuid4()


def _make_tool(input_kwargs: dict) -> NavigateTool:
    """Create a NavigateTool with the given input kwargs."""
    return NavigateTool(
        metadata=NavigateMetadata(current_frontend_url=FRONTEND_URL),
        input_schema=NavigateInput(**input_kwargs),
    )


def _make_input(**kwargs) -> NavigateInput:
    """Shortcut to build a NavigateInput (triggers validation)."""
    return NavigateInput(**kwargs)


# ---------------------------------------------------------------------------
# _url_parts / _project_prefix parsing
# ---------------------------------------------------------------------------


class TestUrlParsing:
    """Tests for _url_parts and _project_prefix properties."""

    def test_valid_url(self):
        tool = _make_tool({"page_type": "home"})
        base, vlab, proj = tool._url_parts
        assert base == BASE_URL
        assert vlab == VLAB_ID
        assert proj == PROJECT_ID

    def test_project_prefix(self):
        tool = _make_tool({"page_type": "home"})
        assert tool._project_prefix == PREFIX

    def test_trailing_slash_in_url(self):
        url = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/"
        tool = NavigateTool(
            metadata=NavigateMetadata(current_frontend_url=url),
            input_schema=NavigateInput(page_type="home"),
        )
        assert tool._project_prefix == PREFIX

    def test_deep_path_after_project(self):
        url = f"{BASE_URL}/app/virtual-lab/{VLAB_ID}/{PROJECT_ID}/data/browse/entity/memodel"
        tool = NavigateTool(
            metadata=NavigateMetadata(current_frontend_url=url),
            input_schema=NavigateInput(page_type="home"),
        )
        base, vlab, proj = tool._url_parts
        assert vlab == VLAB_ID
        assert proj == PROJECT_ID

    def test_invalid_url_missing_virtual_lab(self):
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=f"{BASE_URL}/app/something-else/x/y"
            ),
            input_schema=NavigateInput(page_type="home"),
        )
        with pytest.raises(ValueError, match="Cannot parse current_frontend_url"):
            _ = tool._url_parts

    def test_invalid_url_too_few_segments(self):
        tool = NavigateTool(
            metadata=NavigateMetadata(
                current_frontend_url=f"{BASE_URL}/app/virtual-lab/{VLAB_ID}"
            ),
            input_schema=NavigateInput(page_type="home"),
        )
        with pytest.raises(ValueError, match="Cannot parse current_frontend_url"):
            _ = tool._url_parts


# ---------------------------------------------------------------------------
# Simple page types (home, team, credits, help, reports, notebooks)
# ---------------------------------------------------------------------------


class TestSimplePages:
    """Tests for page types that produce straightforward URLs."""

    @pytest.mark.parametrize(
        "page_type, expected_suffix",
        [
            ("home", ""),
            ("team", "/team"),
            ("credits", "/credits"),
            ("help", "/help"),
            ("reports", "/reports"),
        ],
    )
    @pytest.mark.asyncio
    async def test_simple_page(self, page_type, expected_suffix):
        tool = _make_tool({"page_type": page_type})
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}{expected_suffix}"

    @pytest.mark.asyncio
    async def test_notebooks_no_scope(self):
        tool = _make_tool({"page_type": "notebooks"})
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/notebooks"

    @pytest.mark.asyncio
    async def test_notebooks_project_scope(self):
        tool = _make_tool({"page_type": "notebooks", "scope": "project"})
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/notebooks?scope=project"


# ---------------------------------------------------------------------------
# Data URL builder
# ---------------------------------------------------------------------------


class TestDataUrls:
    """Tests for data page URL generation."""

    @pytest.mark.asyncio
    async def test_data_landing(self):
        tool = _make_tool({"page_type": "data"})
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/data"

    @pytest.mark.asyncio
    async def test_data_landing_with_scope(self):
        tool = _make_tool({"page_type": "data", "scope": "project"})
        result = await tool.arun()
        assert "scope=project" in str(result.url)

    @pytest.mark.asyncio
    async def test_data_landing_with_brain_region(self):
        tool = _make_tool(
            {
                "page_type": "data",
                "brain_region_id": "br-123",
                "brain_region_hierarchy": "h-456",
            }
        )
        result = await tool.arun()
        url = str(result.url)
        assert "br_id=br-123" in url
        assert "h_id=h-456" in url

    @pytest.mark.asyncio
    async def test_data_browse_by_type(self):
        tool = _make_tool({"page_type": "data", "entity_type": "memodel"})
        result = await tool.arun()
        url = str(result.url)
        assert f"{PREFIX}/data/browse/entity/memodel" in url
        assert "group=models" in url

    @pytest.mark.parametrize(
        "entity_type, expected_group",
        [
            ("cell-morphology", "experimental"),
            ("emodel", "models"),
            ("single-neuron-simulation", "simulations"),
        ],
    )
    @pytest.mark.asyncio
    async def test_data_browse_group_mapping(self, entity_type, expected_group):
        tool = _make_tool({"page_type": "data", "entity_type": entity_type})
        result = await tool.arun()
        assert f"group={expected_group}" in str(result.url)

    @pytest.mark.asyncio
    async def test_data_browse_with_brain_region_and_scope(self):
        tool = _make_tool(
            {
                "page_type": "data",
                "entity_type": "circuit",
                "brain_region_id": "br-1",
                "brain_region_hierarchy": "h-1",
                "scope": "project",
            }
        )
        result = await tool.arun()
        url = str(result.url)
        assert "group=models" in url
        assert "br_id=br-1" in url
        assert "h_id=h-1" in url
        assert "scope=project" in url

    @pytest.mark.asyncio
    async def test_data_detail_view_default_section(self):
        tool = _make_tool(
            {
                "page_type": "data",
                "entity_type": "memodel",
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/data/view/memodel/{ENTITY_ID}/overview"

    @pytest.mark.asyncio
    async def test_data_detail_view_explicit_section(self):
        tool = _make_tool(
            {
                "page_type": "data",
                "entity_type": "memodel",
                "entity_id": str(ENTITY_ID),
                "entity_section": "analysis",
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/data/view/memodel/{ENTITY_ID}/analysis"

    @pytest.mark.asyncio
    async def test_data_entity_id_shortcut(self):
        tool = _make_tool(
            {
                "page_type": "data",
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{BASE_URL}/app/{VLAB_ID}/{PROJECT_ID}/{ENTITY_ID}"


# ---------------------------------------------------------------------------
# Workflow URL builder
# ---------------------------------------------------------------------------


class TestWorkflowUrls:
    """Tests for workflow page URL generation."""

    @pytest.mark.asyncio
    async def test_workflow_landing(self):
        tool = _make_tool({"page_type": "workflows"})
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/workflows"

    @pytest.mark.asyncio
    async def test_workflow_landing_with_phase_filter(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "build",
            }
        )
        result = await tool.arun()
        url = str(result.url)
        assert "activity=build" in url
        assert "tactivity=build" in url

    @pytest.mark.asyncio
    async def test_workflow_landing_with_type_filter(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "build",
                "workflow_entity_type": "memodel",
            }
        )
        result = await tool.arun()
        url = str(result.url)
        assert "activity=build" in url
        assert "tactivity=build" in url
        assert "type=memodel" in url
        assert "ttype=memodel" in url

    @pytest.mark.asyncio
    async def test_workflow_landing_with_scope(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "scope": "project",
            }
        )
        result = await tool.arun()
        assert "scope=project" in str(result.url)

    @pytest.mark.parametrize("wf_type", list(_BUILD_NEW_TYPES))
    @pytest.mark.asyncio
    async def test_build_new(self, wf_type):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "build",
                "workflow_action": "new",
                "workflow_entity_type": wf_type,
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/workflows/build/new/{wf_type}"

    @pytest.mark.parametrize("wf_type", list(_SIMULATE_NEW_TYPES))
    @pytest.mark.asyncio
    async def test_simulate_new(self, wf_type):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "simulate",
                "workflow_action": "new",
                "workflow_entity_type": wf_type,
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/workflows/simulate/new/{wf_type}"

    @pytest.mark.parametrize("wf_type", list(_BUILD_CONFIGURE_TYPES))
    @pytest.mark.asyncio
    async def test_build_configure_no_id(self, wf_type):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "build",
                "workflow_action": "configure",
                "workflow_entity_type": wf_type,
            }
        )
        result = await tool.arun()
        assert str(result.url) == f"{PREFIX}/workflows/build/configure/{wf_type}"

    @pytest.mark.parametrize("wf_type", list(_SIMULATE_CONFIGURE_TYPES))
    @pytest.mark.asyncio
    async def test_simulate_configure_with_id(self, wf_type):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "simulate",
                "workflow_action": "configure",
                "workflow_entity_type": wf_type,
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url) == (
            f"{PREFIX}/workflows/simulate/configure/{wf_type}/{ENTITY_ID}"
        )

    @pytest.mark.asyncio
    async def test_workflow_view_default_section(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "simulate",
                "workflow_action": "view",
                "workflow_entity_type": "single-neuron-simulation",
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url) == (
            f"{PREFIX}/workflows/view/single-neuron-simulation/{ENTITY_ID}/overview"
        )

    @pytest.mark.asyncio
    async def test_workflow_view_explicit_section(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "simulate",
                "workflow_action": "view",
                "workflow_entity_type": "single-neuron-simulation",
                "entity_id": str(ENTITY_ID),
                "entity_section": "results",
            }
        )
        result = await tool.arun()
        assert str(result.url) == (
            f"{PREFIX}/workflows/view/single-neuron-simulation/{ENTITY_ID}/results"
        )


# ---------------------------------------------------------------------------
# Validator: scope isolation
# ---------------------------------------------------------------------------


class TestValidatorScopeIsolation:
    """Fields must only appear with their allowed page_type."""

    @pytest.mark.parametrize(
        "page_type", ["home", "team", "credits", "help", "reports"]
    )
    def test_entity_id_rejected_on_non_data_non_workflow(self, page_type):
        with pytest.raises(ValidationError, match="entity_id.*only valid"):
            _make_input(page_type=page_type, entity_id=str(ENTITY_ID))

    @pytest.mark.parametrize(
        "page_type", ["home", "team", "credits", "help", "reports"]
    )
    def test_entity_section_rejected_on_non_data_non_workflow(self, page_type):
        with pytest.raises(ValidationError, match="entity_section.*only valid"):
            _make_input(page_type=page_type, entity_section="overview")

    @pytest.mark.parametrize(
        "field",
        ["brain_region_id", "brain_region_hierarchy"],
    )
    def test_data_only_fields_rejected_on_workflows(self, field):
        kwargs = {"page_type": "workflows", field: "some-value"}
        with pytest.raises(
            ValidationError, match=f"'{field}'.*only valid.*page_type='data'"
        ):
            _make_input(**kwargs)

    def test_entity_type_rejected_on_workflows(self):
        """entity_type is a Literal — Pydantic rejects it at the type level before our validator."""
        with pytest.raises(ValidationError, match="only valid.*page_type='data'"):
            _make_input(page_type="workflows", entity_type="memodel")

    @pytest.mark.parametrize(
        "page_type", ["home", "team", "credits", "help", "reports"]
    )
    def test_scope_rejected_on_non_data_workflow_notebook(self, page_type):
        with pytest.raises(ValidationError, match="scope.*only valid"):
            _make_input(page_type=page_type, scope="project")

    def test_scope_accepted_on_data(self):
        inp = _make_input(page_type="data", scope="project")
        assert inp.scope == "project"

    def test_scope_accepted_on_workflows(self):
        inp = _make_input(page_type="workflows", scope="project")
        assert inp.scope == "project"

    def test_scope_accepted_on_notebooks(self):
        inp = _make_input(page_type="notebooks", scope="project")
        assert inp.scope == "project"

    @pytest.mark.parametrize(
        "field",
        ["workflow_phase", "workflow_action", "workflow_entity_type"],
    )
    def test_workflow_fields_rejected_on_data(self, field):
        kwargs = {"page_type": "data"}
        if field == "workflow_phase":
            kwargs[field] = "build"
        elif field == "workflow_action":
            kwargs[field] = "new"
        else:
            kwargs[field] = "memodel"
        with pytest.raises(
            ValidationError, match=f"'{field}'.*only valid.*page_type='workflows'"
        ):
            _make_input(**kwargs)


# ---------------------------------------------------------------------------
# Validator: data page rules
# ---------------------------------------------------------------------------


class TestValidatorDataPage:
    """Validation rules specific to page_type='data'."""

    def test_entity_section_requires_type_and_id(self):
        with pytest.raises(ValidationError, match="entity_section requires both"):
            _make_input(
                page_type="data",
                entity_type="memodel",
                entity_section="analysis",
            )

    def test_entity_section_requires_entity_type(self):
        with pytest.raises(ValidationError, match="entity_section requires both"):
            _make_input(
                page_type="data",
                entity_id=str(ENTITY_ID),
                entity_section="overview",
            )

    def test_brain_region_incompatible_with_entity_id(self):
        with pytest.raises(ValidationError, match="brain_region_id.*browse/landing"):
            _make_input(
                page_type="data",
                entity_id=str(ENTITY_ID),
                entity_type="memodel",
                brain_region_id="br-1",
                brain_region_hierarchy="h-1",
            )

    def test_brain_region_both_or_neither_only_id(self):
        with pytest.raises(
            ValidationError,
            match="brain_region_id and brain_region_hierarchy must be provided together",
        ):
            _make_input(
                page_type="data",
                brain_region_id="br-1",
            )

    def test_brain_region_both_or_neither_only_hierarchy(self):
        with pytest.raises(
            ValidationError,
            match="brain_region_id and brain_region_hierarchy must be provided together",
        ):
            _make_input(
                page_type="data",
                brain_region_hierarchy="h-1",
            )

    def test_brain_region_both_provided_ok(self):
        inp = _make_input(
            page_type="data",
            brain_region_id="br-1",
            brain_region_hierarchy="h-1",
        )
        assert inp.brain_region_id == "br-1"

    def test_entity_section_invalid_for_type(self):
        """cell-morphology only supports 'overview'."""
        with pytest.raises(
            ValidationError, match="entity_section 'analysis' is not available"
        ):
            _make_input(
                page_type="data",
                entity_type="cell-morphology",
                entity_id=str(ENTITY_ID),
                entity_section="analysis",
            )

    @pytest.mark.parametrize(
        "entity_type, section",
        [
            ("memodel", "analysis"),
            ("memodel", "configuration"),
            ("memodel", "related-artifacts"),
            ("circuit", "related-publications"),
            ("single-neuron-simulation", "results"),
            ("single-neuron-simulation", "configuration"),
            ("emodel", "analysis"),
            ("emodel", "configuration"),
            ("me-model-with-synapses", "related-publications"),
            ("me-model-with-synapses", "related-artifacts"),
        ],
    )
    def test_valid_entity_section_per_type(self, entity_type, section):
        inp = _make_input(
            page_type="data",
            entity_type=entity_type,
            entity_id=str(ENTITY_ID),
            entity_section=section,
        )
        assert inp.entity_section == section

    def test_all_entity_types_in_section_map(self):
        """Every entity type in _ENTITY_TYPE_TO_GROUP must have an entry in _ENTITY_TYPE_SECTIONS."""
        for et in _ENTITY_TYPE_TO_GROUP:
            assert et in _ENTITY_TYPE_SECTIONS, (
                f"{et} missing from _ENTITY_TYPE_SECTIONS"
            )

    def test_entity_id_alone_is_valid(self):
        """entity_id without entity_type is the shortcut route."""
        inp = _make_input(page_type="data", entity_id=str(ENTITY_ID))
        assert inp.entity_id == ENTITY_ID

    def test_entity_type_alone_is_valid(self):
        """entity_type without entity_id is the browse route."""
        inp = _make_input(page_type="data", entity_type="memodel")
        assert inp.entity_type == "memodel"

    def test_detail_view_no_section_is_valid(self):
        """entity_type + entity_id without section defaults to overview in URL builder."""
        inp = _make_input(
            page_type="data",
            entity_type="memodel",
            entity_id=str(ENTITY_ID),
        )
        assert inp.entity_section is None


# ---------------------------------------------------------------------------
# Validator: workflow page rules
# ---------------------------------------------------------------------------


class TestValidatorWorkflowPage:
    """Validation rules specific to page_type='workflows'."""

    def test_action_requires_phase(self):
        with pytest.raises(
            ValidationError, match="workflow_action requires workflow_phase"
        ):
            _make_input(
                page_type="workflows",
                workflow_action="new",
                workflow_entity_type="memodel",
            )

    def test_entity_id_without_action_rejected(self):
        with pytest.raises(
            ValidationError, match="entity_id in workflows requires workflow_action"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                entity_id=str(ENTITY_ID),
            )

    def test_entity_section_only_with_view(self):
        with pytest.raises(
            ValidationError,
            match="entity_section is only used with workflow_action='view'",
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="new",
                workflow_entity_type="memodel",
                entity_section="overview",
            )

    # --- new action ---

    def test_new_requires_wf_type(self):
        with pytest.raises(
            ValidationError, match="workflow_action='new' requires workflow_entity_type"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="new",
            )

    def test_new_forbids_entity_id(self):
        with pytest.raises(
            ValidationError, match="workflow_action='new' does not accept entity_id"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="new",
                workflow_entity_type="memodel",
                entity_id=str(ENTITY_ID),
            )

    # --- configure action ---

    def test_configure_requires_wf_type(self):
        with pytest.raises(
            ValidationError,
            match="workflow_action='configure' requires workflow_entity_type",
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="configure",
            )

    def test_build_configure_forbids_entity_id(self):
        with pytest.raises(
            ValidationError, match="build.*configure.*does not accept entity_id"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="configure",
                workflow_entity_type="memodel",
                entity_id=str(ENTITY_ID),
            )

    def test_simulate_configure_requires_entity_id(self):
        with pytest.raises(
            ValidationError, match="simulate.*configure.*requires entity_id"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="configure",
                workflow_entity_type="circuit",
            )

    # --- view action ---

    def test_view_requires_wf_type(self):
        with pytest.raises(
            ValidationError,
            match="workflow_action='view' requires workflow_entity_type",
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="view",
                entity_id=str(ENTITY_ID),
            )

    def test_view_requires_entity_id(self):
        with pytest.raises(
            ValidationError, match="workflow_action='view' requires entity_id"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="view",
                workflow_entity_type="single-neuron-simulation",
            )

    # --- phase+action type cross-validation ---

    def test_build_new_rejects_simulate_type(self):
        with pytest.raises(ValidationError, match="not valid for.*build"):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="new",
                workflow_entity_type="single-neuron-simulation",
            )

    def test_simulate_new_rejects_build_type(self):
        with pytest.raises(ValidationError, match="not valid for.*simulate"):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="new",
                workflow_entity_type="memodel",
            )

    def test_simulate_configure_rejects_invalid_type(self):
        with pytest.raises(ValidationError, match="not valid for.*simulate"):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="configure",
                workflow_entity_type="single-neuron-simulation",
                entity_id=str(ENTITY_ID),
            )

    def test_build_configure_rejects_circuit(self):
        with pytest.raises(ValidationError, match="not valid for.*build"):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="configure",
                workflow_entity_type="circuit",
            )

    # --- workflow view entity_section validation ---

    def test_workflow_view_invalid_section_for_type(self):
        """single-neuron-simulation supports overview/configuration/results, not analysis."""
        with pytest.raises(
            ValidationError, match="entity_section 'analysis' is not available"
        ):
            _make_input(
                page_type="workflows",
                workflow_phase="simulate",
                workflow_action="view",
                workflow_entity_type="single-neuron-simulation",
                entity_id=str(ENTITY_ID),
                entity_section="analysis",
            )

    def test_workflow_view_valid_section(self):
        inp = _make_input(
            page_type="workflows",
            workflow_phase="simulate",
            workflow_action="view",
            workflow_entity_type="single-neuron-simulation",
            entity_id=str(ENTITY_ID),
            entity_section="results",
        )
        assert inp.entity_section == "results"

    # --- landing page with filters (no action) ---

    def test_landing_with_phase_only(self):
        inp = _make_input(page_type="workflows", workflow_phase="build")
        assert inp.workflow_phase == "build"
        assert inp.workflow_action is None

    def test_landing_with_phase_and_type(self):
        inp = _make_input(
            page_type="workflows",
            workflow_phase="build",
            workflow_entity_type="memodel",
        )
        assert inp.workflow_entity_type == "memodel"


# ---------------------------------------------------------------------------
# Validator: multiple errors in one pass
# ---------------------------------------------------------------------------


class TestValidatorMultipleErrors:
    """Validator should collect multiple errors and join them."""

    def test_multiple_scope_errors(self):
        """Providing data-only + workflow-only fields on 'home' should produce multiple errors."""
        with pytest.raises(ValidationError) as exc_info:
            _make_input(
                page_type="home",
                entity_id=str(ENTITY_ID),
                entity_section="overview",
            )
        msg = str(exc_info.value)
        assert "entity_id" in msg
        assert "entity_section" in msg

    def test_data_brain_region_multiple_errors(self):
        """brain_region_id with entity_id AND without hierarchy should produce two errors."""
        with pytest.raises(ValidationError) as exc_info:
            _make_input(
                page_type="data",
                entity_type="memodel",
                entity_id=str(ENTITY_ID),
                brain_region_id="br-1",
            )
        msg = str(exc_info.value)
        assert "browse/landing" in msg
        assert "must be provided together" in msg


# ---------------------------------------------------------------------------
# Output model
# ---------------------------------------------------------------------------


class TestNavigateOutput:
    """Tests for the NavigateOutput model."""

    def test_valid_url(self):
        out = NavigateOutput(url="https://example.com/page")
        assert str(out.url) == "https://example.com/page"

    def test_invalid_url_rejected(self):
        with pytest.raises(ValidationError):
            NavigateOutput(url="not-a-url")


# ---------------------------------------------------------------------------
# is_online
# ---------------------------------------------------------------------------


class TestIsOnline:
    @pytest.mark.asyncio
    async def test_always_online(self):
        assert await NavigateTool.is_online() is True


# ---------------------------------------------------------------------------
# Edge cases / regressions
# ---------------------------------------------------------------------------


class TestEdgeCases:
    """Miscellaneous edge cases."""

    def test_default_page_type_is_home(self):
        inp = _make_input()
        assert inp.page_type == "home"

    @pytest.mark.asyncio
    async def test_entity_section_none_defaults_to_overview_in_data_url(self):
        """When entity_section is None, the URL builder should use 'overview'."""
        tool = _make_tool(
            {
                "page_type": "data",
                "entity_type": "circuit",
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url).endswith("/overview")

    @pytest.mark.asyncio
    async def test_entity_section_none_defaults_to_overview_in_workflow_view(self):
        tool = _make_tool(
            {
                "page_type": "workflows",
                "workflow_phase": "simulate",
                "workflow_action": "view",
                "workflow_entity_type": "single-neuron-simulation",
                "entity_id": str(ENTITY_ID),
            }
        )
        result = await tool.arun()
        assert str(result.url).endswith("/overview")

    @pytest.mark.parametrize(
        "entity_type",
        list(_ENTITY_TYPE_TO_GROUP.keys()),
    )
    def test_all_19_entity_types_accepted(self, entity_type):
        """Every browsable entity type should be accepted by the validator."""
        inp = _make_input(page_type="data", entity_type=entity_type)
        assert inp.entity_type == entity_type

    def test_invalid_entity_type_rejected(self):
        with pytest.raises(ValidationError):
            _make_input(page_type="data", entity_type="not-a-real-type")

    def test_invalid_page_type_rejected(self):
        with pytest.raises(ValidationError):
            _make_input(page_type="nonexistent")

    def test_invalid_workflow_phase_rejected(self):
        with pytest.raises(ValidationError):
            _make_input(page_type="workflows", workflow_phase="extract")

    def test_invalid_workflow_action_rejected(self):
        with pytest.raises(ValidationError):
            _make_input(
                page_type="workflows",
                workflow_phase="build",
                workflow_action="delete",
            )

    def test_invalid_entity_section_rejected(self):
        with pytest.raises(ValidationError):
            _make_input(
                page_type="data",
                entity_type="memodel",
                entity_id=str(ENTITY_ID),
                entity_section="nonexistent-tab",
            )

    @pytest.mark.parametrize(
        "entity_type, sections",
        list(_ENTITY_TYPE_SECTIONS.items()),
    )
    def test_all_entity_type_sections_valid(self, entity_type, sections):
        """Every section listed in _ENTITY_TYPE_SECTIONS should pass validation."""
        for section in sections:
            inp = _make_input(
                page_type="data",
                entity_type=entity_type,
                entity_id=str(ENTITY_ID),
                entity_section=section,
            )
            assert inp.entity_section == section
