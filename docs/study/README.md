# Material de estudio · Study material (rama `docs`)

> Esta rama **no se fusiona a main**. Contiene el mismo código que la rama del proyecto, pero comentado en
> español (y con los comentarios en inglés originales), más estas guías.

| Archivo | Para qué |
|---|---|
| [01-project-guide.md](01-project-guide.md) | Guía del proyecto completo: arquitectura, capa común, modelo de datos, módulos, ciclo de vida, seeder, testing, Docker y glosario |
| [02-defense-guide.md](02-defense-guide.md) | Guía de la sustentación según la rúbrica: flujo de la petición, justificación de decisiones, riesgos y mejoras, banco de preguntas, 11 ejercicios de cambio en vivo verificados y chuleta |

**Cómo estudiar el código comentado:** cada archivo de `src/` y `test/` empieza con un bloque `[ES]` que explica qué
es, en qué capa de NestJS vive y por qué existe. Los puntos críticos tienen comentarios en línea, sobre todo en:

1. `src/app.setup.ts` y `src/app.module.ts` (pipeline global)
2. `src/common/guards/*` y `src/common/decorators/*`
3. `src/modules/maintenances/maintenances.service.ts` (reglas, transacciones, locks, cruce de horarios)
4. `src/modules/database/seed.service.ts` (idempotencia)

> Los comentarios no cambian el comportamiento: al compilar el proyecto entero (src, specs, e2e, configs) sin
> comentarios, el JavaScript generado es idéntico al de la rama del proyecto.
