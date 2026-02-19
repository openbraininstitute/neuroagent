# State Management: Configuring Through Chat

Neuroagent can help you configure simulations and other settings directly through conversation. Instead of manually filling out forms, you can describe what you want, and the agent will update the configuration for you.

## What is State Management?

State management is how Neuroagent remembers and modifies your current configuration while you chat. When you're on a configuration page (like setting up a simulation), the agent can see what you've already configured and make changes based on your requests.

## How It Works

When you ask the agent to configure something, it:

1. **Reads your current configuration** - The agent checks what you've already set up
2. **Makes the changes you requested** - Updates specific fields based on your instructions
3. **Shows you the results** - The configuration updates immediately in the UI

All changes happen in real-time. You'll see forms fill out, dropdowns change, and settings update as you chat.

## What Can I Ask?

You can ask the agent to configure simulations in natural language. Here are some examples:

### Setting Up a Simulation

- "Configure a simulation for the hippocampus CA1 region"
- "Set up a paired neuron simulation"
- "Create a small microcircuit simulation"
- "I want to simulate 100 neurons from layer 5"

### Modifying Existing Configuration

- "Change the simulation duration to 500ms"
- "Set the title to 'My Experiment'"
- "Use a different brain region"
- "Add a description explaining this is a test run"

### Checking Your Configuration

- "What's currently configured?"
- "Show me the simulation settings"
- "Is this configuration complete?"
- "What still needs to be set?"

## Building Configurations Incrementally

You don't need to specify everything at once. The agent supports incremental configuration:

1. **Start with basics:** "Set up a simulation for the somatosensory cortex"
2. **Add details:** "Make it 1000ms long"
3. **Refine further:** "Add 50 neurons from layer 2/3"
4. **Validate when ready:** "Is this configuration complete?"

The agent tracks your progress and only validates when you indicate you're done or when it believes all required information is provided.

## What Happens Behind the Scenes

The agent uses three specialized tools to manage state:

- **Reading state** - Checks your current configuration before making changes
- **Editing state** - Applies your requested modifications
- **Validating state** - Ensures the configuration is complete and correct

You don't need to worry about these details - just describe what you want in natural language.

## Navigation Links

If you're not already on the right page to see your configuration, the agent will provide a link to navigate there. For example, if you configure a simulation while viewing a different page, the agent will give you a direct link to the simulation configuration page.

## Tips for Best Results

- **Be specific when possible:** "Set the duration to 500ms" is clearer than "make it longer"
- **Ask questions:** If you're unsure what to configure, ask "What do I need to set up for a simulation?"
- **Build incrementally:** Start with high-level requests, then add details
- **Validate when done:** Ask "Is this ready?" or "Can I run this now?" to check completeness

## Current Capabilities

State management currently supports:

- **Small microcircuit simulations** - Configure circuit-based simulations with specific brain regions, layers, and neuron populations
- **Paired neuron simulations** - Set up simulations between two connected neurons

More configuration types will be added in the future.

## Example Conversation

**You:** "I want to set up a simulation for the hippocampus"

**Agent:** "I'll configure a simulation for the hippocampus region. What type of simulation would you like - a small microcircuit or paired neurons?"

**You:** "Small microcircuit with 100 neurons"

**Agent:** "Updated the configuration with a hippocampus microcircuit simulation targeting 100 neurons. Would you like to specify which layers or cell types to include?"

**You:** "Use pyramidal cells from CA1"

**Agent:** "Configuration updated with CA1 pyramidal cells. The simulation is now configured and ready. You can review the full settings on the configuration page."

## Questions?

If you're unsure about anything, just ask the agent:

- "How do I configure a simulation?"
- "What can you help me set up?"
- "What information do you need from me?"
- "Can you explain what this configuration does?"

The agent is designed to guide you through the process conversationally.
