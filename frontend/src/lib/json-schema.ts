export const scs_post_json = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "title": "InputSCSPost",
    "type": "object",
    "properties": {
      "me_model_id": {
        "type": "string",
        "description": "ID of the neuron model to be used in the simulation. The model ID can be fetched using the 'memodelgetall-tool'."
      },
      "current_injection__inject_to": {
        "type": "string",
        "description": "Section to inject the current to.",
        "default": "soma[0]"
      },
      "current_injection__stimulus__stimulus_type": {
        "type": "string",
        "enum": ["current_clamp", "voltage_clamp", "conductance"],
        "description": "Type of stimulus to be used.",
        "default": "current_clamp"
      },
      "current_injection__stimulus__stimulus_protocol": {
        "type": "string",
        "enum": ["ap_waveform", "idrest", "iv", "fire_pattern"],
        "description": "Stimulus protocol to be used.",
        "default": "ap_waveform"
      },
      "current_injection__stimulus__amplitudes": {
        "type": "array",
        "description": "List of amplitudes for the stimulus.",
        "minItems": 1,
        "items": {
          "type": "number"
        },
        "default": [0.1]
      },
      "record_from": {
        "type": "array",
        "description": "List of sections to record from during the simulation. Each record configuration includes the section name and offset.",
        "minItems": 1,
        "items": {
          "type": "object",
          "properties": {
            "section": {
              "type": "string",
              "description": "Section to record from.",
              "default": "soma[0]"
            },
            "offset": {
              "type": "number",
              "minimum": 0,
              "maximum": 1,
              "description": "Offset in the section to record from.",
              "default": 0.5
            }
          },
          "required": ["section", "offset"],
          "additionalProperties": false
        },
        "default": [
          {
            "section": "soma[0]",
            "offset": 0.5
          }
        ]
      },
      "conditions__celsius": {
        "type": "integer",
        "minimum": 0,
        "maximum": 50,
        "description": "Temperature in celsius.",
        "default": 34
      },
      "conditions__vinit": {
        "type": "integer",
        "description": "Initial voltage in mV.",
        "default": -73
      },
      "conditions__hypamp": {
        "type": "integer",
        "description": "Holding current in nA.",
        "default": 0
      },
      "conditions__max_time": {
        "type": "integer",
        "maximum": 3000,
        "description": "Maximum simulation time in ms.",
        "default": 100
      },
      "conditions__time_step": {
        "type": "number",
        "minimum": 0.001,
        "maximum": 10,
        "description": "Time step in ms.",
        "default": 0.05
      },
      "conditions__seed": {
        "type": "integer",
        "description": "Random seed.",
        "default": 100
      }
    },
    "required": [
      "me_model_id",
      "current_injection__inject_to",
      "current_injection__stimulus__stimulus_type",
      "current_injection__stimulus__stimulus_protocol",
      "current_injection__stimulus__amplitudes",
      "record_from",
      "conditions__celsius",
      "conditions__vinit",
      "conditions__hypamp",
      "conditions__max_time",
      "conditions__time_step",
      "conditions__seed"
    ],
    "additionalProperties": false
  }
