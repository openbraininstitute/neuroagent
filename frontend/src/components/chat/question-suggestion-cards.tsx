import React from "react";
import { Card } from "@/components/ui/card";
import { SuggestedQuestions } from "@/lib/types";

type QuestionSuggestionCardsProps = {
  suggestions?: SuggestedQuestions;
  onSubmit: (suggestionInput?: string) => void;
};

export default function QuestionSuggestionCards({
  suggestions,
  onSubmit,
}: QuestionSuggestionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {suggestions &&
        suggestions?.suggestions?.map((q, index) => (
          <Card
            key={index}
            onClick={() => onSubmit(q.question)}
            className="flex justify-center items-center p-5 hover:bg-muted hover:scale-[1.02] hover:shadow-md cursor-pointer"
          >
            <p className="text-center">{q.question}</p>
          </Card>
        ))}
    </div>
  );
}
