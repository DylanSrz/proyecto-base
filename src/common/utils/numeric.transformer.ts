/**
 * [ES] Transformer de TypeORM para columnas numeric (ej: finalCost).
 * PostgreSQL devuelve numeric como STRING ("350000.00") para no perder
 * precisión; este transformer lo convierte a number al leer (from).
 * [EN] Converts PostgreSQL numeric strings to numbers.
 */
import type { ValueTransformer } from 'typeorm';

/** PostgreSQL returns numeric columns as strings; this keeps them as numbers. */
export const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) =>
    value === null || value === undefined ? null : Number(value),
};
