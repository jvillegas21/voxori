import { z } from 'zod';
import { createAgentFromTemplateSchema, updateAgentFromTemplateSchema } from '@voxori/shared';

interface TemplateField {
  key: string;
  type: 'string' | 'string[]' | 'number' | 'boolean';
  required: boolean;
}

interface TemplateFieldSchema {
  fields: TemplateField[];
}

function getFieldValidator(field: TemplateField): z.ZodTypeAny {
  switch (field.type) {
    case 'string':
      return z.string().trim().min(1);
    case 'string[]':
      return z.array(z.string().trim().min(1)).min(1);
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    default:
      return z.unknown();
  }
}

export function createBusinessProfileSchema(templateSchema: TemplateFieldSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of templateSchema.fields) {
    const validator = getFieldValidator(field);
    shape[field.key] = field.required ? validator : validator.optional();
  }

  return z.object(shape);
}

export function parseCreateAgentFromTemplateInput(input: unknown) {
  return createAgentFromTemplateSchema.parse(input);
}

export function parseUpdateAgentFromTemplateInput(input: unknown) {
  return updateAgentFromTemplateSchema.parse(input);
}

export function parseBusinessProfile(input: unknown, templateSchema: TemplateFieldSchema) {
  return createBusinessProfileSchema(templateSchema).parse(input);
}
