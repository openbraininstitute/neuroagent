import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ToolParameter = {
  name: string;
  required: boolean;
  default: string | null;
  description: string;
};

type ToolInputSchemaParameterProps = {
  parameter: ToolParameter;
};

export function ToolInputSchemaParameter({
  parameter,
}: ToolInputSchemaParameterProps) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{parameter.name}</span>
          {parameter.required && (
            <span className="text-sm text-red-500">*required</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{parameter.description}</p>
        {parameter.default !== null && (
          <p className="text-sm">
            <span className="font-semibold">Default:</span> {parameter.default}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
