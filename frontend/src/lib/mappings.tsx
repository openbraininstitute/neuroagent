import {
  Brain,
  Cpu,
  LoaderPinwheel,
  PocketKnife,
  ScrollText,
  Telescope,
} from "lucide-react";

export const agentIconMapping: Record<string, React.JSX.Element> = {
  Agent: <LoaderPinwheel />,
  explore_agent: <Telescope />,
  simulation_agent: <Cpu />,
  literature_agent: <ScrollText />,
  utility_agent: <PocketKnife />,
  triage_agent: <Brain />,
} as const;
