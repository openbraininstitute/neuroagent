## Single Cell Simulation Example (OBI-One)

Below is a step-by-step single-cell simulation example using the OBI-One Python API (openbraininstitute/obi-one). It shows how to:

- select an MEModel (morphology+electrical model),
- build and validate a simulation configuration (stimulus, recordings, timestamps),
- generate a grid-scan / single simulation,
- and run the simulation with BlueCelluLab (the usual backend used in OBI-One examples).

You will need obi_one installed and configured, plus credentials / db_client as required by your environment. Replace placeholder IDs (e.g., <MEMODEL-ID>) and file paths with real values.

### 1) Select an MEModel to simulate
```python
# Option A: use a known MEModel ID
entity_ID = \"<MEMODEL-ID>\  # <<< Replace with real MEModel UUID

# Option B: (interactive selection helper used in examples)
# memodel_ids = get_entities.get_entities(\memodel\", token, memodel_ids,
#                                         project_context=project_context,
#                                         multi_select=False,
#                                         default_scale=\small\")
# memodel_ids[0] would then be used below
```

### 2) Build the MEModel simulation configuration (form API)
```python
from pathlib import Path
import obi_one as obi

# === Parameters ===
sim_duration = 3000.0  # ms

# Create an empty config for MEModel-based simulation
sim_conf = obi.MEModelSimulationScanConfig.empty_config()

# Info block
info = obi.Info(
    campaign_name=\MEModel Simulation\",
    campaign_description=\Single-cell MEModel simulation with constant current stimulus\"
)
sim_conf.set(info, name=\info\")

# Regular timestamps (example: a single repetition covering simulation)
regular_timestamps = obi.RegularTimestamps(start_time=0.0, number_of_repetitions=1, interval=sim_duration)
sim_conf.add(regular_timestamps, name='RegularTimestamps')

# Somatic current clamp stimulus (Constant current)
stimulus = obi.ConstantCurrentClampSomaticStimulus(
    timestamps=regular_timestamps.ref,
    duration=2000.0,
    amplitude=0.5  # nA (example)
)
sim_conf.add(stimulus, name=\CurrentClampInput\")

# Record soma voltage
voltage_recording = obi.SomaVoltageRecording()
sim_conf.add(voltage_recording, name='VoltageRecording')

# Optionally limit the time window recorded
time_window_voltage_recording = obi.TimeWindowSomaVoltageRecording(start_time=0.0, end_time=2000.0)
sim_conf.add(time_window_voltage_recording, name='TimeWindowVoltageRecording')

# Initialization: point to the MEModel by ID and set simulation length
simulations_initialize = obi.MEModelSimulationScanConfig.Initialize(
    circuit=obi.MEModelFromID(id_str=entity_ID),
    simulation_length=sim_duration
)
sim_conf.set(simulations_initialize, name='initialize')

# Validate and get validated configuration object
validated_sim_conf = sim_conf.validated_config()
print(\Validated config:\", validated_sim_conf)
```

### 3) Wrap config into a GridScan / single simulation configuration
(OBI-One uses GridScan tasks to generate concrete config files; for a single point you still create a grid with a single cell)
```python
# Create a GridScan generation task for the validated form
grid_scan = obi.GridScanGenerationTask(
    form=validated_sim_conf,
    coordinate_directory_option=\ZERO_INDEX\",
    output_root='../../../obi-output/memodel_simulations/grid_scan'  # change to desired output
)

# (Optional) inspect multi-value parameters or coordinates
grid_scan.multiple_value_parameters(display=True)
grid_scan.coordinate_parameters(display=True)

# Execute generation (requires db_client configured)
grid_scan.execute(db_client=db_client)
```

### 4) Run the generated simulation with BlueCelluLab backend
```python
from obi_one.scientific.library.simulation_execution import run

# Path to simulation_config.json from generated single config
simulation_config_path = grid_scan.single_configs[0].coordinate_output_root / \simulation_config.json\"
print(\Simulation config path:\", simulation_config_path)

# Run the simulation (bluecellulab is typical)
run(
    simulation_config=simulation_config_path,
    simulatorluecellulab\",  # or 
eurodamus\"
    save_nwb=False  # optionally save NWB
)
```

### 5) Load and analyze results with bluepysnap
```python
import bluepysnap

snap_simulation = bluepysnap.Simulation(simulation_config_path)
spikes = snap_simulation.spikes

print(\spikes time_start, time_stop, dt:\", spikes.time_start, spikes.time_stop, spikes.dt)
print(\population names:\", spikes.population_names)

# Access soma voltage report
soma_report = snap_simulation.reports['SomaVoltage']
print(\SomaVoltage time_start, time_stop, dt:\", soma_report.time_start, soma_report.time_stop, soma_report.dt)

# Example: inspect the head of the spike report dataframe
filtered = spikes.filter(t_start=spikes.time_start, t_stop=spikes.time_stop)
print(filtered.report.head())
```

## Notes, tips and placeholders
- **Replace** <MEMODEL-ID> with the actual MEModel UUID from EntityCore.
- You need a configured db_client variable (OBI-One examples use a DB client for GridScan generation) \u2014 ensure you have credentials and environment set up as per your installation.
- If you prefer to pick an MEModel interactively or via EntityCore queries, use the platform's EntityCore helpers to get MEModel IDs (examples in the repository show interactive selection).
- The examples above are adapted from the OBI-One example notebooks:
  - examples/F_single_cell_simulations/entitysdk_memodel_simulation.ipynb
  - examples/F_single_cell_simulations/entitysdk_memodel_with_synapses_simulation.ipynb

If you want, I can:
- provide a minimal runnable script adjusted to your environment (if you give me the MEModel ID and where your db_client/config is stored),
- or show how to query EntityCore for available MEModels and pick one programmatically. Which would you like?
