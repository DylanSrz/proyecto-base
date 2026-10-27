/**
 * [ES] Esquema de validación de variables de entorno con Zod.
 * ConfigModule llama envSchema.parse() al arrancar: si una variable falta o es
 * inválida, la aplicación NO inicia (fail fast). Además transforma tipos:
 * strings del .env -> number/boolean/array.
 * Env es el tipo TypeScript inferido del esquema (z.infer), usado en
 * ConfigService<Env, true> para tener autocompletado y tipos correctos.
 * [EN] Zod schema that validates and types the environment variables.
 */
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  // [ES] z.coerce.number(): convierte el string "3000" a número 3000.
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  // [ES] 'true'/'false' (string) -> boolean real.
  DB_SYNC: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  // [ES] Exige un secreto de al menos 32 caracteres (seguridad del JWT).
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().default(3600),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
  // Comma-separated list of keys accepted in the x-api-key header (external integrations)
  // [ES] "key1,key2" -> ['key1','key2']. Cada key debe tener >= 8 caracteres y debe haber al menos una.
  API_KEYS: z
    .string()
    .min(1)
    .transform((v) =>
      v
        .split(',')
        .map((key) => key.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(8)).min(1)),
});

export type Env = z.infer<typeof envSchema>;
