## Summary \u2014 Circuit connectivity (circuit **2eb602ea-9ffc-42a2-9fb7-5234921343d0**)
Focus: inhibitory \u2192 excitatory connections restricted to **layer 2** (pre_selection layer=2, post_selection layer=2), grouped by **mtype**.

- **Edge population used:** **S1nonbarrel_neurons__S1nonbarrel_neurons__chemical**
- **Pre node set:** **Inhibitory**
- **Post node set:** **Excitatory**
- **Filters applied:** **pre_selection:** { **layer:** **2** } ; **post_selection:** { **layer:** **2** }
- **Group by:** **mtype**

## Results \u2014 Connection probability (grouped by mtype)
- **Pre mtype:** **L23_CHC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Connection probability:** **100.0%**

- **Pre mtype:** **L23_LBC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Connection probability:** **0.0%**

- **Pre mtype:** **L23_NBC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Connection probability:** **16.666666666666668%**

## Results \u2014 Mean number of synapses per connection (grouped by mtype)
- **Pre mtype:** **L23_CHC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Mean synapses:** **7.333333333333333**

- **Pre mtype:** **L23_LBC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Mean synapses:** **0.0**

- **Pre mtype:** **L23_NBC** \u2192 **Post mtype:** **L2_TPC:B**
  - **Mean synapses:** **33.0**

## Notes and interpretation
- All identified inhibitory-to-excitatory connections in layer 2 target **L2_TPC:B** (a layer-2 excitatory morphological type).
- **L23_CHC** interneurons show a high (100%) connection probability but a moderate mean synapse count (~7.33 per connection).
- **L23_NBC** interneurons connect less frequently (~16.7% probability) but with a high mean synapse count (~33 synapses) when they do connect.
- **L23_LBC** shows no detected connections to **L2_TPC:B** under the applied layer=2 filters.

If you want, I can:
- Group by a different property (e.g., layer or synapse_class)
- Include other edge populations (e.g., thalamic inputs)
- Return raw table-formatted values or visualize these results (bar plots) \u2014 tell me which option you prefer.
