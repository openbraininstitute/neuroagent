import { create } from "zustand";
import { LLMModel } from "./types";
import { components } from "@/lib/obione";

type SimulationsForm = components["schemas"]["SimulationsForm"];

interface StoreState {
  newMessage: string;
  setNewMessage: (message: string) => void;
  checkedTools: { [tool: string]: boolean };
  setCheckedTools: (checkedToolsObject: { [tool: string]: boolean }) => void;
  currentModel: LLMModel;
  setCurrentModel: (model: LLMModel) => void;
  simConfigJson: Record<string, SimulationsForm>;
  setSimConfigJson: (json: Record<string, SimulationsForm>) => void;
}

export const useStore = create<StoreState>((set) => ({
  newMessage: "",
  setNewMessage: (message) => set({ newMessage: message }),
  checkedTools: {},
  setCheckedTools: (checkedToolsObject) =>
    set({ checkedTools: checkedToolsObject }),
  currentModel: {
    id: "openai/gpt-4.1-mini",
    name: "OpenAI: GPT-4.1-mini",
    metadata: "(0.4$/M tokens, 1048k context length, 14/04/2025)",
  },
  setCurrentModel: (model) => set({ currentModel: model }),
  simConfigJson: {
    smc_simulation_config: {
      type: "SimulationsForm",
      timestamps: {},
      stimuli: {},
      recordings: {},
      neuron_sets: {},
      synaptic_manipulations: {},
      initialize: {
        type: "SimulationsForm.Initialize",
        circuit: {
          type: "CircuitFromID",
          id_str: "",
        },
        node_set: {
          block_dict_name: "",
          block_name: "",
          type: "NeuronSetReference",
        },
        simulation_length: 1000,
        extracellular_calcium_concentration: 1.1,
        v_init: -80,
        random_seed: 1,
      },
      info: {
        type: "Info",
        campaign_name: "name",
        campaign_description: "description",
      },
    },
  },
  setSimConfigJson: (json) => set({ simConfigJson: json }),
}));
