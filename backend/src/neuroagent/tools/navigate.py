"""Navigate tool — generate a platform URL from human-readable context."""

from typing import ClassVar, Literal, get_args
from urllib.parse import urlparse
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, Field, model_validator

from neuroagent.tools.base_tool import BaseMetadata, BaseTool

# ---------------------------------------------------------------------------
# Entity type Literal for data URLs.
#
# BrowsableEntityType lists the 19 entity types that appear as tiles in the
# data section (Experimental / Models / Simulations tabs).  These are the
# only types a user can browse to via /data/browse/entity/<type>.
#
# The detail view (/data/view/[type]/[id]/[section]) technically accepts any
# TExtendedEntitiesTypeDict value, but the entity-id shortcut
# (/app/[vlabId]/[projectId]/[entityId]) auto-resolves the type, so the LLM
# never needs to guess a type outside this list.
# ---------------------------------------------------------------------------

# Experimental data types (7)
ExperimentalEntityType = Literal[
    "cell-morphology",
    "electrical-cell-recording",
    "ion-channel-recording",
    "experimental-neuron-density",
    "experimental-bouton-density",
    "experimental-synapses-per-connection",
    "em-cell-mesh",
]

# Model data types (6)
ModelEntityType = Literal[
    "single-neuron-synaptome",
    "me-model-with-synapses",
    "emodel",
    "memodel",
    "circuit",
    "ion-channel-model",
]

# Simulation data types (6)
SimulationEntityType = Literal[
    "single-neuron-simulation",
    "single-neuron-synaptome-simulation",
    "me-model-circuit-simulation",
    "single-neuron-circuit-simulation",
    "paired-neuron-circuit-simulation",
    "small-microcircuit-simulation",
]

DataEntityType = ExperimentalEntityType | ModelEntityType | SimulationEntityType

# ---------------------------------------------------------------------------
# Literal types mirroring the frontend route hierarchy
# ---------------------------------------------------------------------------

# Top-level page sections within a virtual-lab project
PageType = Literal[
    "home",
    "data",
    "workflows",
    "notebooks",
    "reports",
    "help",
    "team",
    "credits",
]

# Scope filter — query param `scope=` on data, workflow, and notebook pages
# Omitting scope (None) defaults to public in the UI.
Scope = Literal["project"]

# Workflow phases — maps to /workflows/<phase>/...
WorkflowPhase = Literal["build", "simulate"]

# Workflow actions within a phase
WorkflowAction = Literal["new", "configure", "view"]

# Detail-view section tabs — from DetailViewSectionsDict in the frontend
DetailViewSection = Literal[
    "overview",
    "results",
    "analysis",
    "related-publications",
    "related-artifacts",
    "configuration",
]

# ---------------------------------------------------------------------------
# Workflow-specific entity types per phase and action.
#
# These are derived from the Next.js route tree:
#   /workflows/build/configure/<static-type>     (no [id])
#   /workflows/build/new/[type]                  (dynamic)
#   /workflows/simulate/configure/<static-type>/[id]
#   /workflows/simulate/new/[type]               (dynamic)
#   /workflows/view/[type]/[id]/[section]
# ---------------------------------------------------------------------------

# build/configure — static routes, NO entity_id
_BUILD_CONFIGURE_TYPES: tuple[str, ...] = (
    "memodel",
    "ion-channel-modeling-campaign",
    "single-neuron-synaptome",
)

# simulate/configure — static routes, REQUIRES entity_id
_SIMULATE_CONFIGURE_TYPES: tuple[str, ...] = (
    "circuit",
    "memodel",
    "single-neuron-synaptome",
)

# simulate/new — dynamic [type], types from buildAndSimulateConfiguration
# where simulate.disabled=false and no feature flag
_SIMULATE_NEW_TYPES: tuple[str, ...] = (
    "single-neuron-simulation",
    "single-neuron-synaptome-simulation",
    "me-model-circuit-simulation",
    "single-neuron-circuit-simulation",
    "paired-neuron-circuit-simulation",
    "small-microcircuit-simulation",
)

# All types accepted per phase (union of new + configure for that phase)
_PHASE_ALLOWED_TYPES: dict[str, tuple[str, ...]] = {
    "build": _BUILD_CONFIGURE_TYPES,
    "simulate": tuple(set(_SIMULATE_NEW_TYPES) | set(_SIMULATE_CONFIGURE_TYPES)),
}

# Phase+action → allowed types (for precise cross-validation)
_PHASE_ACTION_ALLOWED_TYPES: dict[tuple[str, str], tuple[str, ...]] = {
    ("build", "configure"): _BUILD_CONFIGURE_TYPES,
    ("simulate", "new"): _SIMULATE_NEW_TYPES,
    ("simulate", "configure"): _SIMULATE_CONFIGURE_TYPES,
}

# Landing page table filter types per phase — only types that appear in the
# activity table (buildAndSimulateConfiguration[*].properties.<phase>.type).
# "circuit" is configure-only and does NOT appear in the table.
_PHASE_TABLE_TYPES: dict[str, tuple[str, ...]] = {
    "build": _BUILD_CONFIGURE_TYPES,
    "simulate": _SIMULATE_NEW_TYPES,
}

# configure routes that REQUIRE entity_id (simulate has [id] in the route)
_CONFIGURE_REQUIRES_ID: set[str] = {"simulate"}

# configure routes that MUST NOT have entity_id (build configure has no [id] segment)
_CONFIGURE_NO_ID: set[str] = {"build"}

# Allowed actions per phase.
# build: the UI navigates directly to configure (no "new" step).
# simulate: the UI navigates to new (entity selection) then configure.
_PHASE_ALLOWED_ACTIONS: dict[str, tuple[str, ...]] = {
    "build": ("configure", "view"),
    "simulate": ("new", "configure", "view"),
}

# Union of all workflow entity types (used in the input schema Literal)
WorkflowEntityType = Literal[
    # build (new + configure)
    "memodel",
    "ion-channel-modeling-campaign",
    "single-neuron-synaptome",
    # simulate/configure only (memodel & single-neuron-synaptome already listed)
    "circuit",
    # simulate/new (simulation-result-side)
    "single-neuron-simulation",
    "single-neuron-synaptome-simulation",
    "me-model-circuit-simulation",
    "single-neuron-circuit-simulation",
    "paired-neuron-circuit-simulation",
    "small-microcircuit-simulation",
]

# ---------------------------------------------------------------------------
# Data browse tab groups.
#
# The data landing page has three tabs: Experimental, Models, Simulations.
# The `group` query parameter selects the active tab.
# This mapping resolves an entity type slug to its tab group so the URL
# can include `?group=...` automatically.
# ---------------------------------------------------------------------------
DataGroup = Literal["experimental", "models", "simulations"]

_ENTITY_TYPE_TO_GROUP: dict[str, DataGroup] = {
    **{s: "experimental" for s in get_args(ExperimentalEntityType)},
    **{s: "models" for s in get_args(ModelEntityType)},
    **{s: "simulations" for s in get_args(SimulationEntityType)},
}

# ---------------------------------------------------------------------------
# Allowed detail-view sections per entity type.
#
# Derived from each entity's `detailViewSections` array in the frontend
# entity-configuration domain.  Every entity has "overview"; only some
# have additional tabs.
# ---------------------------------------------------------------------------

_ENTITY_TYPE_SECTIONS: dict[str, tuple[str, ...]] = {
    # Experimental (all overview-only)
    "cell-morphology": ("overview",),
    "electrical-cell-recording": ("overview",),
    "ion-channel-recording": ("overview",),
    "experimental-neuron-density": ("overview",),
    "experimental-bouton-density": ("overview",),
    "experimental-synapses-per-connection": ("overview",),
    "em-cell-mesh": ("overview",),
    # Models
    "single-neuron-synaptome": ("overview", "configuration", "related-artifacts"),
    "me-model-with-synapses": ("overview", "related-publications", "related-artifacts"),
    "emodel": ("overview", "analysis", "configuration"),
    "memodel": ("overview", "analysis", "configuration", "related-artifacts"),
    "circuit": ("overview", "analysis", "related-publications", "related-artifacts"),
    "ion-channel-model": ("overview", "related-artifacts"),
    # Simulations
    "single-neuron-simulation": ("overview", "configuration", "results"),
    "single-neuron-synaptome-simulation": ("overview", "configuration", "results"),
    "me-model-circuit-simulation": ("overview",),
    "single-neuron-circuit-simulation": ("overview",),
    "paired-neuron-circuit-simulation": ("overview",),
    "small-microcircuit-simulation": ("overview",),
}


class NavigateInput(BaseModel):
    """Input schema for the Navigate tool."""

    page_type: PageType = Field(
        default="home",
        description=(
            "Top-level section to navigate to. "
            "'home' = project landing page, "
            "'data' = browse or view data entities, "
            "'workflows' = build / simulate models, "
            "'notebooks' = analysis notebooks, "
            "'reports' = scientific reports, "
            "'help' = platform help, "
            "'team' = manage virtual lab members, "
            "'credits' = manage project credits."
        ),
    )

    # --- Data-specific fields ---
    entity_type: DataEntityType | None = Field(
        default=None,
        description=(
            "Kebab-case entity type slug for data browsing or viewing. "
            "Required when page_type='data' and you want to filter by type or view a specific entity."
        ),
    )
    entity_id: UUID | None = Field(
        default=None,
        description=(
            "UUID of a specific entity. "
            "In data context: if entity_type is also set, navigates to /data/view/<type>/<id>; "
            "if entity_type is omitted, navigates to a shortcut page that auto-resolves the type. "
            "In workflow context: used with workflow_action='configure' (simulate) "
            "or 'view' to identify the specific workflow instance."
        ),
    )
    entity_section: DetailViewSection | None = Field(
        default=None,
        description=(
            "Section tab on a detail page. "
            "Used in data detail view (/data/view/[type]/[id]/[section]) "
            "and workflow view (/workflows/view/[type]/[id]/[section]). "
            "When omitted, defaults to 'overview' in the URL."
        ),
    )

    # --- Brain region filter (query param for data pages) ---
    brain_region_id: str | None = Field(
        default=None,
        description=(
            "Brain region ID to pre-select on the data landing or browse page. "
            "Only used with page_type='data' for general views (landing or browse-by-type), "
            "not for detail views (entity_type + entity_id)."
        ),
    )
    brain_region_hierarchy: str | None = Field(
        default=None,
        description=(
            "Hierarchy ID identifying the brain region hierarchy (i.e. the species). "
            "Must be provided together with brain_region_id — either both or neither. "
            "Each brain region belongs to a unique species hierarchy, so the UI needs "
            "both to display the correct brain region."
        ),
    )
    scope: Scope | None = Field(
        default=None,
        description=(
            "Set to 'project' to show only private project entities. "
            "Applies to data, workflow, and notebook pages. "
            "When omitted, the UI shows public entities only."
        ),
    )

    # --- Workflow-specific fields ---
    workflow_phase: WorkflowPhase | None = Field(
        default=None,
        description=(
            "Workflow phase. Only used when page_type='workflows'. "
            "When set without workflow_action, pre-selects the activity filter on the "
            "workflow landing page (both the top selector and the activity table). "
            "'build' = create models (memodel, ion-channel-modeling-campaign, single-neuron-synaptome). "
            "'simulate' = run simulations."
        ),
    )
    workflow_action: WorkflowAction | None = Field(
        default=None,
        description=(
            "Action within a workflow phase. Requires workflow_phase. "
            "'new' = start a new workflow (requires workflow_entity_type, no entity_id). "
            "'configure' = configure a workflow (requires workflow_entity_type; "
            "build has no entity_id, simulate requires entity_id). "
            "'view' = view a workflow result (requires workflow_entity_type and entity_id)."
        ),
    )
    workflow_entity_type: WorkflowEntityType | None = Field(
        default=None,
        description=(
            "Entity type for the workflow. Only used when page_type='workflows'. "
            "When workflow_action is not set, pre-selects the type filter on the landing page "
            "(both the top selector and the activity table). "
            "Valid types depend on phase AND action: "
            "build/new: memodel, ion-channel-modeling-campaign, single-neuron-synaptome. "
            "build/configure: memodel, ion-channel-modeling-campaign, single-neuron-synaptome. "
            "simulate/new: single-neuron-simulation, single-neuron-synaptome-simulation, "
            "me-model-circuit-simulation, single-neuron-circuit-simulation, "
            "paired-neuron-circuit-simulation, small-microcircuit-simulation. "
            "simulate/configure: circuit, memodel, single-neuron-synaptome."
        ),
    )

    @model_validator(mode="after")
    def _check_consistency(self) -> "NavigateInput":
        """Validate that the field combination maps to a real Next.js route.

        The frontend route tree is:
          /(home)/                                    → home
          /(home)/team/                               → team
          /(home)/credits/                            → credits
          /help/                                      → help
          /reports/                                   → reports
          /notebooks/                                 → notebooks (scope via query param)
          /data/                                      → data landing
          /data/browse/entity/[type]/                 → data browse by type
          /data/view/[type]/[id]/[section]/           → data detail view
          /workflows/                                 → workflow landing
          /workflows/build/configure/<type>/          → build configure (no id)
          /workflows/build/new/[type]/                → build new
          /workflows/simulate/configure/<type>/[id]/  → simulate configure (id required)
          /workflows/simulate/new/[type]/             → simulate new
          /workflows/view/[type]/[id]/[section]/      → workflow detail view
        """
        errors: list[str] = []

        # ── Scope isolation: fields must match their page_type ──────────
        # entity_id and entity_section are shared between data and workflows
        _DATA_ONLY_FIELDS = ("entity_type", "brain_region_id", "brain_region_hierarchy")
        _DATA_OR_WORKFLOW_FIELDS = ("scope",)
        _WORKFLOW_FIELDS = ("workflow_phase", "workflow_action", "workflow_entity_type")

        if self.page_type not in ("data", "workflows"):
            if self.entity_id is not None:
                errors.append(
                    f"'entity_id' is only valid when page_type='data' or 'workflows', "
                    f"but page_type='{self.page_type}'."
                )
            if self.entity_section is not None:
                errors.append(
                    f"'entity_section' is only valid when page_type='data' or 'workflows', "
                    f"but page_type='{self.page_type}'."
                )

        if self.page_type != "data":
            for f in _DATA_ONLY_FIELDS:
                if getattr(self, f) is not None:
                    errors.append(
                        f"'{f}' is only valid when page_type='data', "
                        f"but page_type='{self.page_type}'."
                    )

        if self.page_type not in ("data", "workflows", "notebooks"):
            for f in _DATA_OR_WORKFLOW_FIELDS:
                if getattr(self, f) is not None:
                    errors.append(
                        f"'{f}' is only valid when page_type='data' or 'workflows', "
                        f"but page_type='{self.page_type}'."
                    )

        if self.page_type != "workflows":
            for f in _WORKFLOW_FIELDS:
                if getattr(self, f) is not None:
                    errors.append(
                        f"'{f}' is only valid when page_type='workflows', "
                        f"but page_type='{self.page_type}'."
                    )

        # Bail early on scope errors — the rest assumes correct page_type.
        if errors:
            raise ValueError(" | ".join(errors))

        # ── Data page validation ────────────────────────────────────────
        if self.page_type == "data":
            if self.entity_section is not None and not (
                self.entity_id and self.entity_type
            ):
                errors.append(
                    "entity_section requires both entity_type and entity_id. "
                    "The detail view route is /data/view/[type]/[id]/[section]."
                )
            if self.brain_region_id and self.entity_id:
                errors.append(
                    "brain_region_id is a browse/landing filter and cannot be "
                    "combined with a detail view (entity_id)."
                )
            if self.brain_region_hierarchy and self.entity_id:
                errors.append(
                    "brain_region_hierarchy is a browse/landing filter and cannot be "
                    "combined with a detail view (entity_id)."
                )
            if bool(self.brain_region_id) != bool(self.brain_region_hierarchy):
                errors.append(
                    "brain_region_id and brain_region_hierarchy must be provided together "
                    "(both or neither). Each brain region belongs to a species hierarchy."
                )
            # Validate entity_section against the allowed sections for this entity type
            if self.entity_type and self.entity_id and self.entity_section is not None:
                allowed_sections = _ENTITY_TYPE_SECTIONS.get(
                    self.entity_type, ("overview",)
                )
                if self.entity_section not in allowed_sections:
                    errors.append(
                        f"entity_section '{self.entity_section}' is not available for "
                        f"entity_type '{self.entity_type}'. "
                        f"Allowed sections: {', '.join(allowed_sections)}."
                    )

        # ── Workflow page validation ────────────────────────────────────
        if self.page_type == "workflows":
            phase = self.workflow_phase
            action = self.workflow_action
            wf_type = self.workflow_entity_type

            # workflow_action requires workflow_phase
            if action and not phase:
                errors.append(
                    "workflow_action requires workflow_phase. "
                    "Set workflow_phase to 'build' or 'simulate'."
                )

            # Validate action is allowed for this phase
            if action and phase:
                allowed_actions = _PHASE_ALLOWED_ACTIONS.get(phase, ())
                if action not in allowed_actions:
                    errors.append(
                        f"workflow_action '{action}' is not valid for "
                        f"workflow_phase '{phase}'. "
                        f"Allowed actions: {', '.join(allowed_actions)}."
                    )

            # workflow_entity_type requires workflow_phase (to validate allowed types)
            if wf_type and not phase:
                errors.append(
                    "workflow_entity_type requires workflow_phase. "
                    "Set workflow_phase to 'build' or 'simulate'."
                )

            # entity_id without action makes no sense in workflows
            if self.entity_id and not action:
                errors.append(
                    "entity_id in workflows requires workflow_action to be set "
                    "('configure' or 'view')."
                )

            # entity_section is only meaningful for workflow view
            if self.entity_section is not None and action and action != "view":
                errors.append(
                    f"entity_section is only used with workflow_action='view', "
                    f"not '{action}'."
                )

            # Validate workflow_entity_type against phase (broad check)
            if wf_type and phase:
                allowed = _PHASE_ALLOWED_TYPES.get(phase, ())
                if wf_type not in allowed:
                    errors.append(
                        f"workflow_entity_type '{wf_type}' is not valid for "
                        f"workflow_phase '{phase}'. "
                        f"Allowed: {', '.join(allowed)}."
                    )

                # On the landing page (no action), only table-filterable types
                # are valid — e.g. 'circuit' is configure-only, not a table type.
                if not action:
                    table_types = _PHASE_TABLE_TYPES.get(phase, ())
                    if wf_type not in table_types:
                        errors.append(
                            f"workflow_entity_type '{wf_type}' is not a valid table "
                            f"filter for workflow_phase '{phase}'. "
                            f"Allowed: {', '.join(table_types)}."
                        )

            # Validate workflow_entity_type against phase+action (precise)
            if wf_type and phase and action and action != "view":
                key = (phase, action)
                allowed_for_action = _PHASE_ACTION_ALLOWED_TYPES.get(key, ())
                if allowed_for_action and wf_type not in allowed_for_action:
                    errors.append(
                        f"workflow_entity_type '{wf_type}' is not valid for "
                        f"{phase}/{action}. "
                        f"Allowed: {', '.join(allowed_for_action)}."
                    )

            # action-specific rules
            if action == "new":
                if not wf_type:
                    errors.append(
                        "workflow_action='new' requires workflow_entity_type. "
                        "Specify the type of workflow to create."
                    )
                if self.entity_id:
                    errors.append(
                        "workflow_action='new' does not accept entity_id. "
                        "The 'new' action creates a fresh workflow."
                    )

            if action == "configure":
                if not wf_type:
                    errors.append(
                        "workflow_action='configure' requires workflow_entity_type. "
                        "Specify the type of workflow to configure."
                    )
                # build/configure has NO [id] segment
                if phase in _CONFIGURE_NO_ID and self.entity_id:
                    errors.append(
                        "workflow_phase='build' with workflow_action='configure' "
                        "does not accept entity_id. The build configure route is "
                        "/workflows/build/configure/<type> (no ID segment)."
                    )
                # simulate/configure REQUIRES [id]
                if phase in _CONFIGURE_REQUIRES_ID and not self.entity_id:
                    errors.append(
                        f"workflow_phase='{phase}' with workflow_action='configure' "
                        f"requires entity_id. The route is "
                        f"/workflows/{phase}/configure/<type>/[id]."
                    )

            if action == "view":
                if not wf_type:
                    errors.append(
                        "workflow_action='view' requires workflow_entity_type."
                    )
                if not self.entity_id:
                    errors.append(
                        "workflow_action='view' requires entity_id. "
                        "The view route is /workflows/view/[type]/[id]/[section]."
                    )
                # Validate entity_section against allowed sections for this workflow type
                if wf_type and self.entity_section is not None:
                    allowed_sections = _ENTITY_TYPE_SECTIONS.get(wf_type, ("overview",))
                    if self.entity_section not in allowed_sections:
                        errors.append(
                            f"entity_section '{self.entity_section}' is not available for "
                            f"workflow_entity_type '{wf_type}'. "
                            f"Allowed sections: {', '.join(allowed_sections)}."
                        )

        if errors:
            raise ValueError(" | ".join(errors))

        return self


class NavigateMetadata(BaseMetadata):
    """Metadata for the Navigate tool."""

    current_frontend_url: str


class NavigateOutput(BaseModel):
    """Output of the Navigate tool."""

    url: AnyHttpUrl


class NavigateTool(BaseTool):
    """Class defining the Navigate tool."""

    name: ClassVar[str] = "navigate"
    name_frontend: ClassVar[str] = "Navigate"
    utterances: ClassVar[list[str]] = [
        "Take me to the morphology page",
        "Show me all the e-models",
        "Open the experimental data for bouton density",
        "I want to see circuit X",
        "Navigate to the ion channel recordings",
        "Go to the simulation results",
        "Show me entity abc-123",
        "Open the analysis tab for this me-model",
        "Go to the workflows page",
        "Show me the build workflow for memodel",
        "I want to start a new single neuron simulation",
        "Open the configure page for this circuit simulation",
        "Take me to the simulate phase",
        "Show me my notebooks",
        "Open the project notebooks",
        "Go to the reports page",
        "Navigate to the home page",
        "Open the team management page",
        "How many credits do I have left?",
        "Where can I get help?",
        "Show me the project morphologies",
        "Browse models in the thalamus",
    ]
    description: ClassVar[
        str
    ] = """Generate a valid platform URL to navigate the user to a specific page.

Use this tool generously. Whenever your answer mentions a page, entity, workflow,
or section of the platform, call this tool to produce a clickable link so the user
can jump there directly. Do not hesitate to make multiple calls in a single response
to enrich your answer with links — this dramatically improves the user experience.

# When to Use
- The user explicitly asks to navigate, open, or go to a page.
- You mention or reference any entity, workflow, notebook, or platform section in
  your answer — proactively generate a link even if the user did not ask for one.
- You want to point the user to a specific detail view, browse page, or workflow step.
- You are listing entities or results and want each item to be clickable.

# Important
**CRITICAL**: when page_type='data' and you have an entity_id (including when the user provided it) but the user did NOT explicitly
state the entity type, you MUST leave entity_type as `None`. Do NOT guess it under any circumstances.
The platform will automatically resolve the entity type from the ID.

# Output
Returns a single `url` field. Always present it to the user as a clickable link in your final summary.

# Important Behavior
This tool only generates a URL — it does NOT change the page. The user must click the link to navigate. After calling this tool, stop and present the link. Do not assume the user is on the new page until their next message.

# State-Enabled Pages
This tool can also be used to guide the user to a state-enabled page when `editstate`, `getstate`, or `validatestate` require it.
"""
    description_frontend: ClassVar[str] = (
        "Generate a navigation URL to a platform page."
    )
    metadata: NavigateMetadata
    input_schema: NavigateInput

    async def arun(self) -> NavigateOutput:
        """Build a frontend URL from the provided context."""
        prefix = self._project_prefix

        match self.input_schema.page_type:
            case "home":
                url = prefix
            case "team":
                url = f"{prefix}/team"
            case "credits":
                url = f"{prefix}/credits"
            case "help":
                url = f"{prefix}/help"
            case "reports":
                url = f"{prefix}/reports"
            case "notebooks":
                url = f"{prefix}/notebooks"
                if self.input_schema.scope:
                    url += f"?scope={self.input_schema.scope}"  # Will work once https://github.com/openbraininstitute/core-web-app/issues/1523 is fixed
            case "data":
                url = self._build_data_url(prefix)
            case "workflows":
                url = self._build_workflow_url(prefix)
            case _:
                url = prefix

        return NavigateOutput(url=url)  # type: ignore[arg-type]

    def _build_data_url(self, prefix: str) -> str:
        """Build a URL for the data section."""
        inp = self.input_schema
        params: list[str] = []

        if inp.entity_id and inp.entity_type:
            # Detail view: /data/view/<type>/<id>/<section>
            # [section] is required — there is no page.tsx at /data/view/[type]/[id]
            url = "/".join(
                [
                    prefix,
                    "data",
                    "view",
                    inp.entity_type,
                    str(inp.entity_id),
                    inp.entity_section or "overview",
                ]
            )
        elif inp.entity_id:
            # Shortcut: /app/<vlabId>/<projectId>/<entityId> auto-resolves the type
            base, vlab, proj = self._url_parts
            url = f"{base}/app/{vlab}/{proj}/{inp.entity_id}"
        elif inp.entity_type:
            # Browse filtered by type: /data/browse/entity/<type>
            url = f"{prefix}/data/browse/entity/{inp.entity_type}"
            # Auto-resolve the tab group so the sidebar highlights the right tab
            group = _ENTITY_TYPE_TO_GROUP.get(inp.entity_type)
            if group:
                params.append(f"group={group}")
        else:
            # Data landing page
            url = f"{prefix}/data"

        # Append brain region query params (validator ensures both or neither)
        if inp.brain_region_id and inp.brain_region_hierarchy:
            params.append(f"br_id={inp.brain_region_id}")
            params.append(f"h_id={inp.brain_region_hierarchy}")
        if inp.scope:
            params.append(f"scope={inp.scope}")

        if params:
            url += "?" + "&".join(params)

        return url

    def _build_workflow_url(self, prefix: str) -> str:
        """Build a URL for the workflows section.

        The validator guarantees that by the time we get here:
        - action requires phase
        - new requires wf_type, forbids entity_id
        - configure requires wf_type; build forbids id, simulate requires id
        - view requires wf_type and entity_id
        """
        inp = self.input_schema

        if not inp.workflow_action:
            # Workflow landing page:
            # - `activity` preselects the category in the top selector
            # - `tactivity`/`ttype` filter the activity table
            url = f"{prefix}/workflows"
            params: list[str] = []
            if inp.workflow_phase:
                params.append(f"activity={inp.workflow_phase}")
                params.append(f"tactivity={inp.workflow_phase}")
            if inp.workflow_entity_type:
                us = inp.workflow_entity_type.replace("-", "_")
                params.append(f"ttype={us}")
            if inp.scope:
                params.append(f"scope={inp.scope}")
            if params:
                url += "?" + "&".join(params)
            return url

        match inp.workflow_action:
            case "new":
                return f"{prefix}/workflows/{inp.workflow_phase}/new/{inp.workflow_entity_type}"

            case "configure":
                parts = [
                    prefix,
                    "workflows",
                    inp.workflow_phase,
                    "configure",
                    inp.workflow_entity_type,
                ]
                if inp.entity_id:
                    parts.append(str(inp.entity_id))
                return "/".join(parts)  # type: ignore[arg-type]

            case "view":
                return "/".join(
                    [
                        prefix,
                        "workflows",
                        "view",
                        inp.workflow_entity_type,  # type: ignore[list-item]
                        str(inp.entity_id),
                        inp.entity_section or "overview",
                    ]
                )

        return f"{prefix}/workflows"

    @property
    def _url_parts(self) -> tuple[str, str, str]:
        """Extract (base_url, vlab_id, project_id) from the current frontend URL.

        Assumes the fixed schema: https://<host>/app/virtual-lab/<vlab_id>/<project_id>/...
        """
        parsed = urlparse(self.metadata.current_frontend_url)
        # e.g. ["", "app", "virtual-lab", "<vlab_id>", "<project_id>", ...]
        segments = parsed.path.strip("/").split("/")
        if len(segments) < 4 or segments[0] != "app" or segments[1] != "virtual-lab":
            raise ValueError(
                "Cannot parse current_frontend_url: expected "
                "https://<host>/app/virtual-lab/<vlab_id>/<project_id>/..."
            )
        base = f"{parsed.scheme}://{parsed.netloc}"
        return base, segments[2], segments[3]

    @property
    def _project_prefix(self) -> str:
        """Build the project URL prefix from the current frontend URL."""
        base, vlab, proj = self._url_parts
        return f"{base}/app/virtual-lab/{vlab}/{proj}"

    @classmethod
    async def is_online(cls) -> bool:
        """Tool always online. No external dependencies."""
        return True
