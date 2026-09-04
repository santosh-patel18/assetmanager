'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FieldSchemaEntry {
  type: 'string' | 'number' | 'boolean' | 'date' | 'dropdown';
  required?: boolean;
  options?: string[]; // for dropdown type
}

export type FieldSchema = Record<string, FieldSchemaEntry>;

interface DynamicFieldRendererProps {
  fieldSchema: FieldSchema;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  readOnly?: boolean;
}

/**
 * Renders dynamic form fields based on a category's field_schema.
 * Supports: string, number, boolean, date, dropdown.
 */
export function DynamicFieldRenderer({
  fieldSchema,
  values,
  onChange,
  readOnly = false,
}: DynamicFieldRendererProps) {
  const fields = Object.entries(fieldSchema);

  if (fields.length === 0) {
    return <p className="text-sm text-muted-foreground">No custom fields defined for this category.</p>;
  }

  const handleChange = (key: string, value: unknown) => {
    onChange({ ...values, [key]: value });
  };

  // Format label from snake_case or camelCase
  const formatLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {fields.map(([key, schema]) => {
        const val = values[key];
        const label = formatLabel(key);
        const isRequired = schema.required === true;

        if (readOnly) {
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">
                {schema.type === 'boolean'
                  ? (val ? 'Yes' : 'No')
                  : val !== undefined && val !== null && val !== ''
                    ? String(val)
                    : '—'}
              </span>
            </div>
          );
        }

        return (
          <div key={key}>
            <Label>
              {label}
              {isRequired && <span className="text-red-400 ml-1">*</span>}
            </Label>

            {schema.type === 'string' && (
              <Input
                value={(val as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                placeholder={label}
                required={isRequired}
              />
            )}

            {schema.type === 'number' && (
              <Input
                type="number"
                step="any"
                value={val !== undefined && val !== null ? String(val) : ''}
                onChange={e => handleChange(key, e.target.value ? Number(e.target.value) : null)}
                placeholder={label}
                required={isRequired}
              />
            )}

            {schema.type === 'boolean' && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={!!val}
                  onChange={e => handleChange(key, e.target.checked)}
                  className="rounded"
                  id={`field-${key}`}
                />
                <Label htmlFor={`field-${key}`} className="text-sm text-muted-foreground font-normal">
                  {label}
                </Label>
              </div>
            )}

            {schema.type === 'date' && (
              <Input
                type="date"
                value={(val as string) || ''}
                onChange={e => handleChange(key, e.target.value)}
                required={isRequired}
              />
            )}

            {schema.type === 'dropdown' && (
              <Select
                value={(val as string) || ''}
                onValueChange={v => handleChange(key, v === '__clear__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {!isRequired && <SelectItem value="__clear__">— None —</SelectItem>}
                  {(schema.options || []).map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Display custom field values in read-only formatted view.
 */
export function DynamicFieldDisplay({
  fieldSchema,
  values,
}: {
  fieldSchema: FieldSchema;
  values: Record<string, unknown>;
}) {
  return <DynamicFieldRenderer fieldSchema={fieldSchema} values={values} onChange={() => {}} readOnly />;
}
