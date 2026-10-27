/**
 * [ES] Configuración de Vitest e2e: NODE_ENV=test (usa .env.test) y fileParallelism false
 * (las suites comparten la BD de pruebas y no deben correr a la vez).
 */
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    env: { NODE_ENV: 'test' },
    fileParallelism: false,
    hookTimeout: 30000,
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
