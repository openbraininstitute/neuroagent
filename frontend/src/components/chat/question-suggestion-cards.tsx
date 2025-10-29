import React from "react";
import { Card } from "@/components/ui/card";
import { BQuestionsSuggestions } from "@/lib/types";

type QuestionSuggestionCardsProps = {
  suggestions: BQuestionsSuggestions | null;
  onSubmit: (suggestionInput?: string) => void;
};

const defaultQuestions = {
  suggestions: [
    {
      question:
        "Show me papers about neuron morphologies in the thalamus of rodents",
    },
    {
      question: "Make me 5 SIMPLE random plots.",
    },
    {
      question: "Plot me 3 morphologies from the Thalamus",
    },
    {
      question:
        "What are some recent studies on neuron morphology in the cerebrum?",
    },
  ],
};

export default function QuestionSuggestionCards({
  suggestions,
  onSubmit,
}: QuestionSuggestionCardsProps) {
  const suggestionsMap =
    suggestions !== null && suggestions.suggestions !== undefined
      ? {
          suggestions: [
            ...defaultQuestions.suggestions.slice(0, -1),
            suggestions.suggestions[0],
          ],
        }
      : defaultQuestions;
  return (
    <div className="item-center mx-auto flex max-h-[20vh] max-w-[90%] gap-4 overflow-y-auto rounded-b-xl border-2 border-t-0 border-gray-500/50 bg-gray-300/20 p-4 dark:bg-gray-600/15">
      {suggestionsMap?.suggestions.map((q, index) => (
        <Card
          key={index}
          onClick={() => onSubmit(q.question)}
          className="mx-auto flex max-w-[20vw] cursor-pointer items-center justify-center overflow-auto p-5 hover:scale-[1.02] hover:bg-muted hover:shadow-md"
        >
          <p className="text-center">{q.question}</p>
        </Card>
      ))}
    </div>
  );
}
