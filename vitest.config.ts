/**
 * [ES] Configuración de Vitest para tests unitarios (archivos .spec.ts dentro de src). swc compila TypeScript con decoradores.
 * La cobertura mide TODO src/ (no solo los archivos importados por los tests).
 */
import { defineConfig } from 'vitest/config';
import swc from 'unplugin-swc';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      // Measure every source file, not only the ones imported by the tests
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/modules/database/seed.ts'],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
