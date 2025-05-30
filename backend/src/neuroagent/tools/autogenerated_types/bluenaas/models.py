# generated by fastapi-codegen:
#   filename:  openapi.json
#   timestamp: 2025-05-20T09:11:58+00:00

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, PositiveFloat, RootModel, confloat, conint


class BodyPlaceSynapsesApiBluenaasValidationSynapseFormulaPost(BaseModel):
    formula: str = Field(..., title='Formula')


class BrainRegion(BaseModel):
    id: str = Field(..., title='Id')
    label: str = Field(..., title='Label')


class DeprecateNexusResponse(BaseModel):
    id: str = Field(..., title='Id')
    deprecated: bool = Field(..., title='Deprecated')
    updated_at: datetime = Field(..., title='Updated At')


class ExclusionRule(BaseModel):
    distance_soma_gte: Optional[float] = Field(None, title='Distance Soma Gte')
    distance_soma_lte: Optional[float] = Field(None, title='Distance Soma Lte')


class ExperimentSetupConfig(BaseModel):
    celsius: float = Field(..., title='Celsius')
    vinit: float = Field(..., title='Vinit')
    hypamp: float = Field(..., title='Hypamp')
    max_time: confloat(le=3000.0) = Field(..., title='Max Time')
    time_step: float = Field(..., title='Time Step')
    seed: int = Field(..., title='Seed')


class RecordingLocation(BaseModel):
    section: str = Field(..., title='Section')
    offset: confloat(ge=0.0, le=1.0) = Field(..., title='Offset')


class SectionTarget(RootModel[Literal['apic', 'basal', 'dend', 'soma', 'axon']]):
    root: Literal['apic', 'basal', 'dend', 'soma', 'axon'] = Field(
        ..., title='SectionTarget'
    )


class SimulationStimulusConfig(BaseModel):
    stimulus_type: Literal['current_clamp', 'voltage_clamp', 'conductance'] = Field(
        ..., title='Stimulus Type'
    )
    stimulus_protocol: Optional[
        Literal['ap_waveform', 'idrest', 'iv', 'fire_pattern']
    ] = Field(..., title='Stimulus Protocol')
    amplitudes: Union[List[float], float] = Field(..., title='Amplitudes')


class StimulationItemResponse(BaseModel):
    x: List[float] = Field(..., title='X')
    y: List[float] = Field(..., title='Y')
    name: str = Field(..., title='Name')
    amplitude: float = Field(..., title='Amplitude')


class StimulationPlotConfig(BaseModel):
    stimulus_protocol: Optional[
        Literal['ap_waveform', 'idrest', 'iv', 'fire_pattern']
    ] = Field(..., title='Stimulus Protocol')
    amplitudes: List[float] = Field(..., title='Amplitudes')


class SynapseConfig(BaseModel):
    id: str = Field(..., title='Id')
    name: str = Field(..., title='Name')
    target: Optional[SectionTarget] = None
    type: int = Field(..., title='Type')
    distribution: Literal['exponential', 'linear', 'formula'] = Field(
        ..., title='Distribution'
    )
    formula: Optional[str] = Field(None, title='Formula')
    soma_synapse_count: Optional[int] = Field(None, title='Soma Synapse Count')
    seed: int = Field(..., title='Seed')
    exclusion_rules: Optional[List[ExclusionRule]] = Field(
        None, title='Exclusion Rules'
    )


class SynapsePlacementBody(BaseModel):
    seed: int = Field(..., title='Seed')
    config: SynapseConfig


class SynapsePosition(BaseModel):
    segment_id: int = Field(..., title='Segment Id')
    coordinates: List[float] = Field(..., title='Coordinates')
    position: float = Field(..., title='Position')


class SynapseSimulationConfig(BaseModel):
    id: str = Field(..., title='Id')
    delay: int = Field(..., title='Delay')
    duration: conint(le=3000) = Field(..., title='Duration')
    frequency: Union[confloat(ge=0.0), List[confloat(ge=0.0)]] = Field(
        ..., title='Frequency'
    )
    weight_scalar: PositiveFloat = Field(..., title='Weight Scalar')


class UsedModel(BaseModel):
    id: str = Field(..., title='Id')
    type: Literal['me-model', 'synaptome', 'm-model', 'e-model'] = Field(
        ..., title='Type'
    )
    name: str = Field(..., title='Name')


class ValidationError(BaseModel):
    loc: List[Union[str, int]] = Field(..., title='Location')
    msg: str = Field(..., title='Message')
    type: str = Field(..., title='Error Type')


class SimulationType(
    RootModel[Optional[Literal['single-neuron-simulation', 'synaptome-simulation']]]
):
    root: Optional[Literal['single-neuron-simulation', 'synaptome-simulation']] = Field(
        ..., title='Simulation Type'
    )


class CreatedAtStart(RootModel[Optional[datetime]]):
    root: Optional[datetime] = Field(
        ...,
        description='Filter by createdAt date (YYYY-MM-DDTHH:MM:SSZ)',
        title='Created At Start',
    )


class CreatedAtEnd(RootModel[Optional[datetime]]):
    root: Optional[datetime] = Field(
        ...,
        description='Filter by createdAt date (YYYY-MM-DDTHH:MM:SSZ)',
        title='Created At End',
    )


class ApiBluenaasGraphDirectCurrentPlotPostResponse(
    RootModel[List[StimulationItemResponse]]
):
    root: List[StimulationItemResponse] = Field(
        ...,
        title='Response Retrieve Stimulation Plot Api Bluenaas Graph Direct Current Plot Post',
    )


class ModelType(RootModel[Optional[Literal['me-model', 'synaptome']]]):
    root: Optional[Literal['me-model', 'synaptome']] = Field(..., title='Model Type')


class CurrentInjectionConfig(BaseModel):
    inject_to: str = Field(..., title='Inject To')
    stimulus: SimulationStimulusConfig


class HTTPValidationError(BaseModel):
    detail: Optional[List[ValidationError]] = Field(None, title='Detail')


class MEModelResponse(BaseModel):
    id: str = Field(..., title='Id')
    name: str = Field(..., title='Name')
    description: Optional[str] = Field(..., title='Description')
    type: Literal['me-model', 'synaptome', 'm-model', 'e-model'] = Field(
        ..., title='Type'
    )
    created_by: str = Field(..., title='Created By')
    created_at: datetime = Field(..., title='Created At')
    brain_region: BrainRegion
    m_model: UsedModel
    e_model: UsedModel


class SectionSynapses(BaseModel):
    section_id: str = Field(..., title='Section Id')
    synapses: List[SynapsePosition] = Field(..., title='Synapses')


class SingleNeuronSimulationConfigInput(BaseModel):
    synaptome: Optional[List[SynapseSimulationConfig]] = Field(None, title='Synaptome')
    current_injection: CurrentInjectionConfig
    record_from: List[RecordingLocation] = Field(..., title='Record From')
    conditions: ExperimentSetupConfig
    type: Literal['single-neuron-simulation', 'synaptome-simulation'] = Field(
        ..., title='Type'
    )
    duration: int = Field(..., title='Duration')


class SingleNeuronSimulationConfigOutput(BaseModel):
    synaptome: Optional[List[SynapseSimulationConfig]] = Field(None, title='Synaptome')
    current_injection: CurrentInjectionConfig
    record_from: List[RecordingLocation] = Field(..., title='Record From')
    conditions: ExperimentSetupConfig
    type: Literal['single-neuron-simulation', 'synaptome-simulation'] = Field(
        ..., title='Type'
    )
    duration: int = Field(..., title='Duration')
    n_execs: int = Field(
        ...,
        description='Total number of simulation executions required by the configuration given all parameter combinations',
        title='N Execs',
    )


class SynapsePlacementResponse(BaseModel):
    synapses: List[SectionSynapses] = Field(..., title='Synapses')


class SynaptomeModelResponse(BaseModel):
    id: str = Field(..., title='Id')
    name: str = Field(..., title='Name')
    description: Optional[str] = Field(..., title='Description')
    type: Literal['me-model', 'synaptome', 'm-model', 'e-model'] = Field(
        ..., title='Type'
    )
    created_by: str = Field(..., title='Created By')
    created_at: datetime = Field(..., title='Created At')
    brain_region: BrainRegion
    me_model: UsedModel
    synapses: List[SynapseConfig] = Field(..., title='Synapses')


class ApiBluenaasNeuronModelVirtualLabIdProjectIdModelIdGetResponse(
    RootModel[Union[MEModelResponse, SynaptomeModelResponse]]
):
    root: Union[MEModelResponse, SynaptomeModelResponse] = Field(
        ...,
        title='Response Retrieve Neuron Model Api Bluenaas Neuron Model  Virtual Lab Id   Project Id   Model Id  Get',
    )


class PaginatedResponseUnionMEModelResponseSynaptomeModelResponse(BaseModel):
    offset: int = Field(..., title='Offset')
    page_size: int = Field(..., title='Page Size')
    total: int = Field(..., title='Total')
    results: List[Union[MEModelResponse, SynaptomeModelResponse]] = Field(
        ..., title='Results'
    )


class SimulationDetailsResponse(BaseModel):
    id: str = Field(..., title='Id')
    status: Optional[Literal['pending', 'started', 'success', 'failure']] = Field(
        None, title='Status'
    )
    results: Optional[Dict[str, Any]] = Field(..., title='Results')
    error: Optional[str] = Field(..., title='Error')
    type: Literal['single-neuron-simulation', 'synaptome-simulation'] = Field(
        ..., title='Type'
    )
    name: str = Field(..., title='Name')
    description: str = Field(..., title='Description')
    created_by: str = Field(..., title='Created By')
    created_at: datetime = Field(..., title='Created At')
    injection_location: str = Field(..., title='Injection Location')
    recording_location: Union[List[str], str] = Field(..., title='Recording Location')
    brain_region: BrainRegion
    config: Optional[SingleNeuronSimulationConfigOutput] = None
    me_model_id: str = Field(..., title='Me Model Id')
    synaptome_model_id: Optional[str] = Field(..., title='Synaptome Model Id')


class PaginatedResponseSimulationDetailsResponse(BaseModel):
    offset: int = Field(..., title='Offset')
    page_size: int = Field(..., title='Page Size')
    total: int = Field(..., title='Total')
    results: List[SimulationDetailsResponse] = Field(..., title='Results')
