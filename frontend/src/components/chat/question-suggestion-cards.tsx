import React from "react";
import { Card } from "@/components/ui/card";
import { SuggestedQuestions } from "@/lib/types";

type QuestionSuggestionCardsProps = {
  suggestions?: SuggestedQuestions;
  onSubmit: (suggestionInput?: string) => void;
};

const defaultQuestions = {
  suggestions: [
    {
      question: "Show me papers about neuron morphologies in the thalamus",
    },
    {
      question:
        "Show me papers about intracellular patch clamp data for the thalamus",
    },
    {
      question:
        "Show me papers comparing cell morphologies between neurons in the thalamus",
    },
    {
      question:
        "Show me papers about experimental electrophysiology data for the thalamus?",
    },
  ],
};

export default function QuestionSuggestionCards({
  suggestions,
  onSubmit,
}: QuestionSuggestionCardsProps) {
  const suggestionsMap = suggestions ?? defaultQuestions;
  return (
    <div className="flex item-center bg-gray-600/15 gap-4 border-t-0 border-2 border-gray-500/50 rounded-b-xl mx-auto p-4 overflow-y-auto max-w-[90%] max-h-[20vh]">
      {suggestionsMap?.suggestions?.map((q, index) => (
        <Card
          key={index}
          onClick={() => onSubmit(q.question)}
          className="flex justify-center mx-auto items-center p-5 max-w-[20vw] hover:bg-muted hover:scale-[1.02] hover:shadow-md cursor-pointer overflow-auto"
        >
          <p className="text-center">{q.question}</p>
        </Card>
      ))}
    </div>
  );
}
