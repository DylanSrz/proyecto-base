import type { ValueTransformer } from 'typeorm';

/** PostgreSQL returns numeric columns as strings; this keeps them as numbers. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
