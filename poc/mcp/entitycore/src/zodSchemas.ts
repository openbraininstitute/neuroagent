import { z } from "zod";

export const getBrainRegionsQueryParamsSchema = {
  page: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe("Page number for pagination (e.g., 1, 2)."),
  page_size: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Number of items per page (e.g., 10, 50)."),
  name: z
    .string()
    .optional()
    .nullable()
    .describe("Filter by the exact name of the brain region."),
  name__in: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Filter by a comma-separated list of exact brain region names (e.g., 'Hippocampus,Amygdala')."
    ),
  name__ilike: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Filter by brain region name using a case-insensitive partial match (e.g., 'hipp')."
    ),
  id: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Filter by the unique identifier (UUID string) of the brain region."
    ),
  acronym: z
    .string()
    .optional()
    .nullable()
    .describe("Filter by the acronym of the brain region (e.g., 'HPF')."),
  annotation_value: z
    .number()
    .optional()
    .nullable()
    .describe(
      "Filter by the annotation value associated with the brain region."
    ),
  hierarchy_id: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Filter by the unique identifier (UUID string) of the hierarchy the brain region belongs to."
    ),
  order_by: z
    .string()
    .optional()
    .nullable()
    .describe(
      "Specify the ordering of results. Comma-separated list of field names. Prefix with '-' for descending order (e.g., 'name,-acronym')."
    ),
};

// Infer the TypeScript type from the Zod schema for comparison purposes
const getBrainRegionsQueryParamsZodObject = z.object(
  getBrainRegionsQueryParamsSchema
);
export type InferredGetBrainRegionsQueryParams = z.infer<
  typeof getBrainRegionsQueryParamsZodObject
>;
