## Summary — circuit **2eb602ea-9ffc-42a2-9fb7-5234921343d0**

- **Name / ID:** **nbS1-O1-vSub-nCN-HEX0-L2-01** — **2eb602ea-9ffc-42a2-9fb7-5234921343d0**  
- **Brain region:** **Primary somatosensory area (SSp)**  
- **Species / subject:** *Rattus norvegicus* — **Average rat P14**  
- **Type / scale:** small volumetric subcircuit (10 biophysical neurons)  
- **Key counts:** **number_neurons: 10**, **number_synapses: 186**, **number_connections: 15**  
- Link to entity page: [Circuit page (Open Brain Institute)](https://openbraininstitute.org/app/entity/2eb602ea-9ffc-42a2-9fb7-5234921343d0)

Below I analyze how excitatory (EXC) and inhibitory (INH) neurons connect within this circuit, focusing on the internal (intracircuit) chemical connections.

---

## Nodes — composition and excitation/inhibition breakdown

- Node population included: **S1nonbarrel_neurons** (10 biophysical nodes).
- Properties (from node-level summary):
  - **etype counts:** **cADpyr: 7**, **cNAC: 2**, **dNAC: 1**
  - **morph_class counts:** **PYR: 7**, **INT: 3**
  - **synapse_class:** **EXC: 7**, **INH: 3**

Interpretation:
- The subcircuit contains 7 excitatory pyramidal-type neurons (cADpyr) and 3 inhibitory interneuron-type neurons (cNAC/dNAC). This matches the synapse_class breakdown: 7 EXC nodes, 3 INH nodes.

---

## Internal chemical connectivity (intracircuit) — high-level metrics

The chemical edge population that corresponds to internal connections is:
- **S1nonbarrel_neurons__S1nonbarrel_neurons__chemical**
  - **number_of_edges:** **186**
  - This represents synapses formed between the 10 biophysical nodes (internal synapses).
  - Degree statistics (per-node, internal):
    - **Indegree:** min 0, mean 18.6, median 7.0, max 85.0
    - **Outdegree:** min 0, mean 18.6, median 2.5, max 84.0
    - **Total degree:** min 6, mean 37.2, median 28.0, max 85.0
  - Note: The large spread (min→max) indicates strong heterogeneity in how many internal synapses a neuron receives and sends — a few highly connected nodes (hubs) and several low-degree nodes.

Interpretation:
- On average, each neuron participates in ~37 internal synaptic contacts (in+out), but the median total degree is 28, showing skew (a few nodes with very large connectivity inflate the mean).
- The max indegree/outdegree values (85 / 84) indicate one or a few neurons are highly central — consistent with the circuit being a subnetwork extracted around a central high-centrality neuron.

---

## Excitatory ↔ Inhibitory connectivity patterns (internal)

The tool output does not list explicit counts of EXC→EXC, EXC→INH, INH→EXC, INH→INH per se, but we can infer patterns from available metadata:

What we know:
- There are 7 EXC (PYR) and 3 INH (INT) nodes inside the subcircuit.
- Total internal synapses between these nodes: **186**.
- Node-level degree heterogeneity implies some neurons act as hubs (likely excitatory pyramidal neurons commonly form many outgoing synapses).

Specific observed indicators from the internal-edge property stats:
- Synapse-level properties (conductance, decay_time, delays, etc.) are present and vary across the internal set — but these are per-synapse continuous properties, not direct labels of source/target classes in the provided summary.
- The global synapse_class for nodes is EXC or INH; however the edge-level summary in the circuit metrics does not provide a direct breakdown of how many of the 186 internal edges are excitatory vs inhibitory.

Given the available outputs, the strongest, defensible statements are:

- The circuit contains a majority of excitatory neurons (7/10), so a majority fraction of internal outgoing synapses are likely excitatory (EXC→*), but interneurons (3) can have strong local influence via high-degree inhibitory connections.
- Degree statistics (max indegree/outdegree ~85) show at least one neuron receives/sends a large fraction of the total internal synapses — that central neuron could be an excitatory hub (likely one of the 7 cADpyr), consistent with the subcircuit being centered around a high-centrality neuron in layer 2.
- Because there are 3 inhibitory neurons, some portion of the 186 synapses will be INH→EXC and INH→INH; however we cannot derive exact counts or percentages of EXC→INH, INH→EXC, EXC→EXC, INH→INH from the returned summary alone.

If you want precise counts of the four directed class-to-class connection types (EXC→EXC, EXC→INH, INH→EXC, INH→INH) and per-node mapping, I can run a node-set query that explicitly groups connectivity by the node attribute *synapse_class* (or etype/morph_class) and returns counts. Recommended next steps (I will proceed automatically unless you prefer otherwise):
- Use the circuit connectivity-metrics tool to compute connectivity grouped by sender/receiver synapse_class. Example parameters I will use:
  - circuit_id: **2eb602ea-9ffc-42a2-9fb7-5234921343d0**
  - edge_population: **S1nonbarrel_neurons__S1nonbarrel_neurons__chemical**
  - group_by: **synapse_class** (or equivalent property such as etype/morph_class for pre/post)
  - pre_selection / post_selection filters to select EXC vs INH based on node property (e.g., synapse_class="EXC" or "INH") and compute counts for each pair.
- Also return a small table listing each of the 10 neurons with indegree/outdegree and their class (EXC/INH) so you can see hub identities.

Shall I run that grouping/selection query now and give you exact EXC/INH→EXC/INH counts and per-node degrees?
