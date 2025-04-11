import { z } from "zod";

export const scsPostSchema = z.object({
  me_model_id: z
    .string()
    .describe(
      "ID of the neuron model to be used in the simulation. The model ID can be fetched using the 'memodelgetall-tool'.",
    ),

  current_injection__inject_to: z
    .string()
    .default("soma[0]")
    .describe("Section to inject the current to."),

  current_injection__stimulus__stimulus_type: z
    .enum(["current_clamp", "voltage_clamp", "conductance"])
    .default("current_clamp")
    .describe("Type of stimulus to be used."),

  current_injection__stimulus__stimulus_protocol: z
    .enum(["ap_waveform", "idrest", "iv", "fire_pattern"])
    .default("ap_waveform")
    .describe("Stimulus protocol to be used."),

  current_injection__stimulus__amplitudes: z
    .array(z.number())
    .min(1)
    .default([0.1])
    .describe("List of amplitudes for the stimulus."),

  record_from: z
    .array(
      z.object({
        section: z
          .string()
          .default("soma[0]")
          .describe("Section to record from."),
        offset: z
          .number()
          .min(0)
          .max(1)
          .default(0.5)
          .describe("Offset in the section to record from."),
      }),
    )
    .min(1)
    .default([{ section: "soma[0]", offset: 0.5 }])
    .describe("List of sections to record from during the simulation."),

  conditions__celsius: z
    .number()
    .int()
    .min(0)
    .max(50)
    .default(34)
    .describe("Temperature in celsius."),

  conditions__vinit: z
    .number()
    .int()
    .default(-73)
    .describe("Initial voltage in mV."),

  conditions__hypamp: z
    .number()
    .int()
    .default(0)
    .describe("Holding current in nA."),

  conditions__max_time: z
    .number()
    .int()
    .max(3000)
    .default(100)
    .describe("Maximum simulation time in ms."),

  conditions__time_step: z
    .number()
    .min(0.001)
    .max(10)
    .default(0.05)
    .describe("Time step in ms."),

  conditions__seed: z.number().int().default(100).describe("Random seed."),
});
