import {
  ToolInputSchemaParameter,
  ToolParameter,
} from "@/components/tool-page/tool-input-schema-parameter";

export type ToolInputSchema = {
  parameters: ToolParameter[];
};

type ToolInputSchemaProps = {
  schema: ToolInputSchema;
};

export function ToolInputSchema({ schema }: ToolInputSchemaProps) {
  return (
    <div className="space-y-4">
      {schema.parameters.map((parameter) => (
        <ToolInputSchemaParameter key={parameter.name} parameter={parameter} />
      ))}
    </div>
  );
}
