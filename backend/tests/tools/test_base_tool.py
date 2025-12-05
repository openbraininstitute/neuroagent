"""Tests for base tool classes."""

import pytest

from neuroagent.tools.base_tool import (
    EntitycoreExcludeBRParams,
    EntitycoreExcludeNameParams,
)
from neuroagent.tools.entitycore_brainregion_getall import (
    BrainRegionGetAllInput,
)
from neuroagent.tools.entitycore_cellmorphology_getall import (
    CellMorphologyGetAllInput,
)
from neuroagent.tools.entitycore_circuit_getall import CircuitGetAllInput
from neuroagent.tools.entitycore_electricalcellrecording_getall import (
    ElectricalCellRecordingGetAllInput,
)
from neuroagent.tools.entitycore_emodel_getall import EModelGetAllInput
from neuroagent.tools.entitycore_experimentalboutondensity_getall import (
    ExperimentalBoutonDensityGetAllInput,
)
from neuroagent.tools.entitycore_experimentalneurondensity_getall import (
    ExperimentalNeuronDensityGetAllInput,
)
from neuroagent.tools.entitycore_experimentalsynapsesperconnection_getall import (
    ExperimentalSynapsesPerConnectionGetAllInput,
)
from neuroagent.tools.entitycore_ionchannelmodel_getall import (
    IonChannelModelGetAllInput,
)
from neuroagent.tools.entitycore_ionchannelrecording_getall import (
    IonChannelRecordingGetAllInput,
)
from neuroagent.tools.entitycore_measurementannotation_getall import (
    MeasurementAnnotationGetAllInput,
)
from neuroagent.tools.entitycore_memodel_getall import MEModelGetAllInput
from neuroagent.tools.entitycore_simulation_getall import SimulationGetAllInput
from neuroagent.tools.entitycore_simulationcampaign_getall import (
    SimulationCampaignGetAllInput,
)
from neuroagent.tools.entitycore_simulationgeneration_getall import (
    SimulationGenerationGetAllInput,
)
from neuroagent.tools.entitycore_simulationresult_getall import (
    SimulationResultGetAllInput,
)
from neuroagent.tools.entitycore_singleneuronsimulation_getall import (
    SingleNeuronSimulationGetAllInput,
)
from neuroagent.tools.entitycore_singleneuronsynaptome_getall import (
    SingleNeuronSynaptomeGetAllInput,
)
from neuroagent.tools.entitycore_singleneuronsynaptomesimulation_getall import (
    SingleNeuronSynaptomeSimulationGetAllInput,
)
from neuroagent.tools.entitycore_species_getall import SpeciesGetAllInput
from neuroagent.tools.entitycore_strain_getall import StrainGetAllInput


@pytest.mark.parametrize(
    "input_class",
    [
        CellMorphologyGetAllInput,
        CircuitGetAllInput,
        EModelGetAllInput,
        MEModelGetAllInput,
        SimulationGetAllInput,
        SimulationResultGetAllInput,
        SimulationGenerationGetAllInput,
        SimulationCampaignGetAllInput,
        IonChannelModelGetAllInput,
        IonChannelRecordingGetAllInput,
        SingleNeuronSynaptomeSimulationGetAllInput,
        SingleNeuronSynaptomeGetAllInput,
        SingleNeuronSimulationGetAllInput,
        MeasurementAnnotationGetAllInput,
        ExperimentalSynapsesPerConnectionGetAllInput,
        ExperimentalNeuronDensityGetAllInput,
        ExperimentalBoutonDensityGetAllInput,
        ElectricalCellRecordingGetAllInput,
    ],
)
def test_entitycore_exclude_br_params_fields_excluded(input_class):
    """Test that input classes exclude EntitycoreExcludeBRParams fields from JSON schema and model_dump."""
    schema = input_class.model_json_schema()
    excluded_fields = set(EntitycoreExcludeBRParams.model_fields.keys())
    schema_properties = set(schema.get("properties", {}).keys())
    found_excluded_fields = schema_properties & excluded_fields

    assert (
        len(found_excluded_fields) == 0
    ), f"{input_class.__name__}: Found excluded fields in schema: {found_excluded_fields}"

    input_model_fields = input_class.model_fields
    excluded_field_names = set(EntitycoreExcludeBRParams.model_fields.keys())

    for field_name in excluded_field_names:
        if field_name in input_model_fields:
            field_info = input_model_fields[field_name]
            assert field_info.exclude is True, (
                f"{input_class.__name__}: Field '{field_name}' should have exclude=True "
                f"but has exclude={field_info.exclude}"
            )


@pytest.mark.parametrize(
    "input_class",
    [
        BrainRegionGetAllInput,
        SpeciesGetAllInput,
        StrainGetAllInput,
    ],
)
def test_entitycore_exclude_name_params_fields_excluded(input_class):
    """Test that input classes exclude EntitycoreExcludeNameParams fields from JSON schema and model_dump."""
    schema = input_class.model_json_schema()
    excluded_fields = set(EntitycoreExcludeNameParams.model_fields.keys())
    schema_properties = set(schema.get("properties", {}).keys())
    found_excluded_fields = schema_properties & excluded_fields

    assert (
        len(found_excluded_fields) == 0
    ), f"{input_class.__name__}: Found excluded fields in schema: {found_excluded_fields}"

    input_model_fields = input_class.model_fields
    excluded_field_names = set(EntitycoreExcludeNameParams.model_fields.keys())

    for field_name in excluded_field_names:
        if field_name in input_model_fields:
            field_info = input_model_fields[field_name]
            assert field_info.exclude is True, (
                f"{input_class.__name__}: Field '{field_name}' should have exclude=True "
                f"but has exclude={field_info.exclude}"
            )
