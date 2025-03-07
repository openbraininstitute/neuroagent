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
      question:
        "Do you want to see papers about neuron morphologies in brain stem?",
    },
    {
      question:
        "Do you want to see papers about intracellular patch clamp data for cerebellum?",
    },
    {
      question:
        "Do you want to see papers comparing cell morphologies between neurons in thalamus?",
    },
  ],
};

export default function QuestionSuggestionCards({
  suggestions,
  onSubmit,
}: QuestionSuggestionCardsProps) {
  const suggestionsMap = suggestions ?? defaultQuestions;
  return (
    <div className="flex flex-col gap-4 border-2 border-t-0 border-gray-500 border-opacity-50 rounded-b-xl w-[95%] mx-auto p-4">
      {suggestionsMap?.suggestions?.map((q, index) => (
        <Card
          key={index}
          onClick={() => onSubmit(q.question)}
          className="flex justify-center items-center p-5 hover:bg-muted hover:scale-[1.02] my-2 mx-4 hover:shadow-md cursor-pointer"
        >
          <p className="text-center">{q.question}</p>
        </Card>
      ))}
    </div>
  );
}
