# Guía de sustentación · Defense guide

> Organizada según la rúbrica. Cada sección trae **respuestas modelo** para decir en voz alta (en español,
> con el término en inglés que conviene mencionar) y la ubicación exacta en el código (`ruta:línea`, rama `docs`).

| Puntos | Qué hay que demostrar | Sección |
|---|---|---|
| 8 | Ubicar módulos, controladores y servicios | [§0](#0-ubicar-el-código-en-30-segundos) |
| 12 | Flujo de la petición protegida + dónde están las reglas | [§1](#1-nivel-12--flujo-de-una-petición-protegida) |
| 16 | Justificar decisiones, decoradores, JWT frente a API key, cruce de horarios + cambio en vivo autónomo | [§2](#2-nivel-16--justificar-decisiones-técnicas) |
| 40 | Riesgos y límites, mejoras justificadas, cambio en vivo en la capa correcta | [§3](#3-nivel-40--riesgos-límites-y-mejoras) y [§5](#5-cambios-en-vivo--live-changes) |

---

## 0. Ubicar el código en 30 segundos

> "Cada entidad es un **módulo** con la misma estructura: `entities/`, `dto/`, `service`, `controller`, `module` y su
> `spec`. Lo transversal (guards, decoradores, interceptor, filtro) está en `src/common`. La configuración global
> está en `app.setup.ts` y el registro de módulos y guards globales en `app.module.ts`."

| Si te piden… | Abre… |
|---|---|
| Guards globales | `src/app.module.ts:77-78` |
| ValidationPipe, interceptores, filtro | `src/app.setup.ts:37`, `:54`, `:60` |
| Reglas de mantenimientos | `src/modules/maintenances/maintenances.service.ts` |
| Transiciones de estado | `src/modules/maintenances/maintenance-transitions.ts:25` |
| Cruce de horarios | `maintenances.service.ts:173-184` |
| API key | `src/common/guards/api-key.guard.ts` y `integrations.controller.ts:14` |
| Seeder | `src/modules/database/seed.service.ts` |

---

## 1. Nivel 12 · Flujo de una petición protegida

### 1.1 El orden real en NestJS (request lifecycle)

```
Request
  → Middleware            LoggerMiddleware                    (app.module.ts:84)
  → Guards                JwtAuthGuard → RolesGuard          (app.module.ts:77-78)
                          [ApiKeyGuard solo en rutas @ApiKeyAuth]
  → Interceptors (antes)  TransformInterceptor, ClassSerializer
  → Pipes                 ValidationPipe (global) + ParseUUIDPipe (por parámetro)
  → Controller            recibe el DTO ya validado, delega
  → Service               reglas de negocio, BD, transacciones
  → Interceptors (después) ClassSerializer (quita @Exclude) → Transform (envuelve {success,...})
  → Response
  ✗ Si algo lanza en cualquier punto → AllExceptionsFilter → {success:false, statusCode, message, path, timestamp}
```

> **Respuesta modelo:** "La rúbrica dice `JwtAuthGuard → RolesGuard → ValidationPipe → controlador → servicio →
> Interceptor/Filter`. Es correcto, con un matiz: el **interceptor envuelve** la ejecución. Tiene una parte
> *antes* del controlador y otra *después*; la de después es la que da formato a la respuesta. El **filtro** solo
> actúa si se lanza una excepción, venga de un guard, un pipe o el servicio. Además, antes de los guards corre el
> **middleware** de logging."

**¿Por qué los guards van antes que los pipes?** No tiene sentido validar el body de alguien que no está
autenticado ni autorizado. Si no hay permiso se corta con 401/403 sin gastar trabajo.

**¿Por qué JwtAuthGuard va antes que RolesGuard?** RolesGuard necesita `request.user.role`, y ese dato lo pone
JwtAuthGuard (`jwt-auth.guard.ts:56`). Además, el orden del arreglo `APP_GUARD` es el orden de ejecución.

### 1.2 Ejemplo trazado: `PATCH /api/maintenances/:id/status` con `{ "status": "COMPLETED", ... }`

| Paso | Archivo | ¿Qué puede fallar? | Código |
|---|---|---|---|
| 1. Middleware registra la petición | `logger.middleware.ts` | – | – |
| 2. JwtAuthGuard: ¿token? ¿válido? | `jwt-auth.guard.ts:42-56` | Sin token / vencido | **401** |
| 3. RolesGuard: `@Auth(ADMIN, TECHNICIAN)` | `roles.guard.ts:39` | Rol no permitido | **403** |
| 4. ParseUUIDPipe en `:id` | `maintenances.controller.ts:111` | id no es uuid | **400** |
| 5. ValidationPipe con `UpdateMaintenanceStatusDto` | `update-maintenance-status.dto.ts` | status no es enum, costo negativo, campo extra | **400** |
| 6. Controller → `updateStatus(id, dto, user)` | `maintenances.controller.ts` | – | – |
| 7. Service: abre la transacción y bloquea la fila | `maintenances.service.ts:298` | No existe | **404** |
| 8. ¿Técnico asignado? ¿intenta cancelar? | `:312`, `:440` | No es suyo / cancela | **403** |
| 9. Transición válida | `:316` → `maintenance-transitions.ts:41` | COMPLETED→IN_PROGRESS, SCHEDULED→COMPLETED | **409** |
| 10. Datos de cierre | `:392` | Faltan, kilometraje menor, fecha futura | **400** |
| 11. Guardar mantenimiento + vehículo + log (COMMIT) | `:341` | Error de BD → ROLLBACK | 4xx/500 |
| 12. Interceptores dan formato a la salida | `transform.interceptor.ts:41` | – | **200** |

### 1.3 ¿Dónde se validan las reglas de negocio?

| Tipo de regla | Capa | Ejemplo |
|---|---|---|
| Forma del dato (tipo, formato, rango fijo) | **DTO** (class-validator) | placa con regex, `year` entre 1950 y el año siguiente, `finalCost ≥ 0`, `type` es enum |
| Quién puede llamar la ruta | **Guard** + decorador | `@Auth(Role.ADMIN)` |
| Formato del parámetro de ruta | **Pipe** | `ParseUUIDPipe` |
| Regla que necesita la BD o el estado actual | **Servicio** | placa duplicada, vehículo ocupado, cruce de horario, transición válida, kilometraje frente al del vehículo |
| A quién pertenece el recurso | **Servicio** | el técnico solo ve y cambia sus mantenimientos |
| Unicidad garantizada siempre | **BD** (índice UNIQUE) + filtro → 409 | placa, email, nombre del taller |

---

## 2. Nivel 16 · Justificar decisiones técnicas

### 2.1 ¿Por qué una regla va en el servicio y no en el DTO?

> **Respuesta modelo:** "El DTO solo conoce el **body** de la petición. Sirve para validar **forma**: que la placa
> tenga entre 5 y 10 caracteres o que el costo sea un número positivo. Pero 'la placa ya existe', 'el vehículo
> ya tiene un mantenimiento activo' o 'el mecánico ya tiene algo a esa hora' dependen de **la base de datos y del
> estado actual**, y eso solo se puede saber en el **servicio**, que tiene acceso a los repositorios y a la
> transacción. Además, en el servicio la regla se aplica igual venga la llamada de donde venga (otro servicio, un
> job, un test), mientras que el DTO solo actúa en peticiones HTTP."

Ejemplos concretos en el código:
- **Datos de cierre:** en el DTO son *opcionales* porque solo son obligatorios si `status = COMPLETED`. Esa regla condicional depende del estado actual, así que se valida en el servicio (`maintenances.service.ts:392`) con un mensaje claro: `missing closing information (finalCost, finishedAt)`.
- **Kilometraje:** `@Min(0)` está en el DTO (forma); `mileage ≥ vehicle.mileage` está en el servicio (`:146`) porque necesita leer el vehículo.
- **Placa:** `@Matches` en el DTO, `assertPlateIsFree` en el servicio y `UNIQUE` en la BD: tres capas.

### 2.2 Cómo funcionan los decoradores personalizados

**`@Public()`** (`public.decorator.ts:12`)
```ts
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```
> "`SetMetadata` guarda `isPublic: true` en el método. Como el `JwtAuthGuard` es **global**, se ejecuta en todas
> las rutas; lo primero que hace es leer esa metadata con `Reflector.getAllAndOverride` (`jwt-auth.guard.ts:42`).
> Si está, retorna `true` sin pedir token. Así register y login funcionan sin autenticación."

**`@Roles(...roles)`** (`roles.decorator.ts:13`) y **`@Auth(...roles)`** (`auth.decorator.ts:21`)
> "`@Roles` guarda la lista de roles con `SetMetadata`. El `RolesGuard` la lee y compara con `request.user.role`,
> que viene del JWT. Si no hay roles declarados basta con estar autenticado. `@Auth` es una **composición** con
> `applyDecorators`: pone `@Roles` y además la documentación Swagger (candado, 401, 403) en una sola línea."

**`@CurrentUser(field?)`** (`current-user.decorator.ts:18`)
> "Es un **decorador de parámetro** creado con `createParamDecorator`. Lee `request.user`, que dejó el
> JwtAuthGuard, y lo inyecta en el controlador. `@CurrentUser('sub')` me da solo el id. Así el controlador no
> depende del objeto Request de Express y el id del usuario nunca viene del cliente, sino del token firmado."

**`@ApiKeyAuth()`** (`api-key-auth.decorator.ts:21`)
> "Compone tres cosas: `Public()` para que el JWT global no exija token, `UseGuards(ApiKeyGuard)` para validar
> la key **solo en esa ruta**, y `ApiSecurity` para Swagger."

### 2.3 Guard de JWT frente al guard de x-api-key

| | `JwtAuthGuard` | `ApiKeyGuard` |
|---|---|---|
| Identifica a | Un **usuario** (con rol) | Un **sistema externo** (partner) |
| Alcance | **Global** (`APP_GUARD`) | **Local** (`@UseGuards` vía `@ApiKeyAuth`) |
| Credencial | `Authorization: Bearer <jwt>` firmado con `JWT_SECRET`, expira | Header `x-api-key`, lista `API_KEYS` del .env |
| Valida | Firma + expiración (`verifyAsync`) | Coincidencia en tiempo constante (`timingSafeEqual`) |
| Autoriza roles | Sí (con RolesGuard) | No (la key da acceso al endpoint de integración) |
| Error | 401 / 403 | 401 |

> **Respuesta modelo:** "El JWT autentica personas: el token lleva el id y el rol, y luego el RolesGuard autoriza.
> La API key autentica sistemas: no hay usuario ni rol, solo 'este partner puede consultar historiales'. Por eso
> el endpoint de integración tiene `@Public()` (para saltarse el JWT global) más un guard propio. Si mando un JWT
> válido al endpoint de integración recibo **401**, porque ahí solo vale la key (está probado en el e2e)."

**¿Por qué `timingSafeEqual`?** (`api-key.guard.ts:53`)
> "Una comparación normal con `===` termina en el primer carácter distinto: midiendo el tiempo de respuesta, un
> atacante podría adivinar la key carácter por carácter (**timing attack**). `timingSafeEqual` siempre tarda lo
> mismo. Hasheo ambos lados con SHA-256 porque `timingSafeEqual` exige buffers del mismo largo."

### 2.4 Cómo valido el cruce de horarios del mecánico

Código (`maintenances.service.ts:173-184`):
```ts
const overlapping = await manager
  .createQueryBuilder(Maintenance, 'm')
  .where('m.mechanicId = :mechanicId', { mechanicId: mechanic.id })
  .andWhere('m.status IN (:...statuses)', { statuses: ACTIVE_MAINTENANCE_STATUSES })
  .andWhere('m.scheduledAt < :end AND m.estimatedEndAt > :start', { start, end })
  .getOne();
if (overlapping) throw new ConflictException(...);  // 409
```

> **Respuesta modelo:** "Cada mantenimiento tiene inicio (`scheduledAt`) y fin estimado (`estimatedEndAt`). Dos
> intervalos se cruzan si **cada uno empieza antes de que termine el otro**: `existente.inicio < nuevo.fin` **y**
> `existente.fin > nuevo.inicio`. Busco un mantenimiento **activo** (SCHEDULED o IN_PROGRESS) del **mismo
> mecánico** que cumpla eso. **No filtro por taller**, porque el enunciado dice que tampoco puede cruzarse en
> talleres distintos. Uso desigualdades estrictas, así que uno de 7:30 a 9:00 y otro que empieza a las 9:00 **no**
> chocan (9:00 < 9:00 es falso), que es justo el caso (d) del enunciado."

Casos del enunciado: (a) 7:30 y 7:30 en el mismo taller → cruza. (b) 7:30 y 7:30 en otro taller → cruza (no
filtro por taller). (c) 7:30–9:00 y otro desde 8:00 → cruza. (d) 7:30–9:00 y otro desde 9:00 → **no** cruza.

> "¿Por qué agregué `estimatedEndAt`? Porque con solo una 'fecha programada' no se puede saber si 8:00 cae
> dentro de un trabajo de 7:30 a 9:00: hace falta un fin."

### 2.5 Otras decisiones que te pueden preguntar
- **409 en transiciones inválidas:** la petición es válida en formato (no es 400), pero choca con el **estado actual** del recurso.
- **Máquina de estados como función pura** (`maintenance-transitions.ts`): fácil de leer, de testear (`it.each` con 13 casos) y de cambiar en un solo lugar.
- **Auditoría** (`MaintenanceStatusLog`): el enunciado pide que el admin consulte "auditorías"; cada cambio queda registrado (quién, cuándo, de/a) en la misma transacción.
- **Registro siempre TECHNICIAN:** si el registro público aceptara `role`, cualquiera se haría ADMIN (escalada de privilegios, privilege escalation). El admin sale del seed.
- **Autorización por recurso en el servicio:** el RolesGuard solo sabe el rol; para saber si el mantenimiento *es del técnico* hay que leerlo de la BD (`maintenances.service.ts:250`).
- **Inactivar en lugar de borrar:** el enunciado exige conservar el historial; además las FKs con `RESTRICT` impiden borrar algo que tenga historial.

---

## 3. Nivel 40 · Riesgos, límites y mejoras

### 3.1 ¿Qué pasa si dos peticiones asignan al mismo mecánico a la vez?

**Sin protección (race condition, condición de carrera):**
```
T1: SELECT ¿cruce para Laura 8:00? → no hay
T2: SELECT ¿cruce para Laura 8:00? → no hay      (T1 aún no insertó)
T1: INSERT mantenimiento 8:00
T2: INSERT mantenimiento 8:00                    → ¡Laura queda con dos a la misma hora!
```
Es el patrón "verificar y luego actuar" (**check-then-act**).

**Mi solución:** transacción + **bloqueo pesimista** (`pessimistic_write` = `SELECT … FOR UPDATE`, `maintenances.service.ts:68`).
```
T1: BEGIN; SELECT mecánico Laura FOR UPDATE  → obtiene el lock
T2: BEGIN; SELECT mecánico Laura FOR UPDATE  → ESPERA
T1: verifica cruce → no hay → INSERT → COMMIT (libera el lock)
T2: continúa → verifica cruce → ve el de T1 → 409 → ROLLBACK
```

> **Respuesta modelo:** "Las dos peticiones se **serializan** en la fila del mecánico. La segunda solo puede
> verificar cuando la primera ya confirmó, así que ve el nuevo mantenimiento y recibe 409. Lo mismo hago con el
> vehículo, para la regla de un solo mantenimiento activo. Siempre bloqueo en el mismo orden, **vehículo → mecánico**
> (`:106`, `:121`): si una petición bloqueara mecánico→vehículo y otra vehículo→mecánico, podrían esperarse
> mutuamente (**deadlock**)."

**Límites honestos:**
- El lock serializa *todas* las asignaciones de ese mecánico, aunque sean de días distintos. Con pocos admins no importa; con mucho volumen sería un cuello de botella.
- La garantía vive en el **código de la aplicación**: un INSERT manual en SQL o un futuro endpoint que no use este servicio podría saltársela.
- **Mejora:** una restricción de exclusión en PostgreSQL, que lo garantiza a nivel de BD:
  ```sql
  CREATE EXTENSION btree_gist;
  ALTER TABLE maintenances ADD CONSTRAINT no_mechanic_overlap
    EXCLUDE USING gist (mechanic_id WITH =, tstzrange(scheduled_at, estimated_end_at) WITH &&)
    WHERE (status IN ('SCHEDULED', 'IN_PROGRESS'));
  ```
  `tstzrange` es semiabierto `[inicio, fin)`, igual que mi regla. Para "un activo por vehículo" bastaría un
  **índice único parcial**: `CREATE UNIQUE INDEX ON maintenances(vehicle_id) WHERE status IN ('SCHEDULED','IN_PROGRESS');`.
  Ambos lanzarían errores de BD: `23505` ya se traduce a 409, y `23P01` (exclusion_violation) habría que agregarlo a `PG_ERRORS` en el filtro.

### 3.2 ¿Por qué una transacción al cambiar el estado del mantenimiento y del vehículo?

> **Respuesta modelo:** "Al completar escribo **tres** cosas: el mantenimiento (COMPLETED + datos de cierre), el
> vehículo (AVAILABLE + kilometraje) y el log de auditoría. Si el servidor falla después de guardar el
> mantenimiento pero antes del vehículo, sin transacción quedaría el mantenimiento COMPLETED y el vehículo en
> IN_MAINTENANCE para siempre: **datos inconsistentes**. Con `dataSource.transaction` todo es **atómico**: si cualquier
> paso lanza una excepción se hace ROLLBACK y no se guarda nada; si todo sale bien se hace COMMIT de todo junto."

Detalles que suman puntos:
- Dentro de la transacción **hay que usar el `manager`** que entrega `transaction()`. Si uso `this.repo` por fuera, esa escritura **no** forma parte de la transacción.
- Además bloqueo la fila del mantenimiento: si dos personas cambian el mismo estado a la vez, la segunda ve el estado ya cambiado y recibe 409 (por ejemplo, dos "COMPLETED" seguidos).
- Las validaciones se hacen **antes** de escribir, así el ROLLBACK casi nunca es necesario, pero existe como red de seguridad.

### 3.3 ¿Cómo evito duplicados en el seeder?

> **Respuesta modelo:** "El seeder es **idempotente**. Por cada registro busco por una **clave natural**: email
> del usuario o del mecánico, placa del vehículo, nombre del taller, y vehículo + descripción para el
> mantenimiento. Solo inserto si no existe (`findOrCreate`, `seed.service.ts:187`). Uso `withDeleted: true` para
> encontrar también los registros con soft delete. Los logs de auditoría solo se crean si el mantenimiento es
> nuevo (`:140`). Todo corre en una transacción: si falla a la mitad, no queda nada a medias. Lo probé corriéndolo
> dos veces: la segunda da `{"users":0,"mechanics":0,...}`."

**Límites y mejoras:**
- La clave natural del mantenimiento (vehículo + descripción) es frágil: si edito la descripción en `seed-data.ts`, se inserta otro.
- No hay una restricción UNIQUE sobre esa clave, así que dos seeds ejecutados **a la vez** podrían duplicar. Mejora: constraint única + `INSERT … ON CONFLICT DO NOTHING` (upsert).
- Las fechas del mantenimiento IN_PROGRESS son relativas a "ahora".

### 3.4 Otros límites de mi solución (y su mejora)

| Límite | Riesgo | Mejora propuesta |
|---|---|---|
| `DB_SYNC=true` (synchronize) | En producción puede alterar o borrar columnas | **Migraciones** de TypeORM versionadas |
| JWT sin revocación | Si se cambia el rol o se desactiva un usuario, su token sigue valiendo hasta que expira | Tokens cortos + **refresh tokens**, o una lista de revocación |
| Login sin límite de intentos | Fuerza bruta (brute force) | `@nestjs/throttler` (rate limiting) |
| API keys en texto plano en el .env, sin identidad | No se sabe qué partner llamó; rotar una key exige redeploy | Tabla de keys **hasheadas** por partner, con expiración y rate limit |
| `estimatedEndAt` es una estimación | Si el trabajo se alarga, la agenda no lo sabe | Al pasar el tiempo estimado, alertar o extender automáticamente |
| Zonas horarias | El cliente debe mandar ISO con `Z` u offset | Documentado; se guarda en `timestamptz` (UTC) |
| Historial de vehículo sin paginar | Con miles de registros la respuesta crece | Paginar `/vehicles/:id/maintenances` |
| No se puede reasignar un mecánico | Hay que cancelar y crear de nuevo | Endpoint `PATCH /maintenances/:id/assignment` con las mismas reglas |
| Los tests unitarios mockean la BD | La consulta SQL real del cruce solo la prueban los e2e | Ya hay e2e que lo cubren; se podrían sumar tests de integración del repositorio |

---

## 4. Banco de preguntas probables · Likely questions

1. **¿Qué diferencia hay entre Guard, Pipe, Interceptor y Filter?** Guard: ¿puede pasar? Pipe: transforma/valida datos de entrada. Interceptor: envuelve la ejecución (antes y después). Filter: atrapa errores y arma la respuesta.
2. **¿Por qué el JwtAuthGuard es global?** Para que *todo* esté protegido por defecto (secure by default). Lo público se marca explícitamente con `@Public()`; si olvido decorar una ruta, queda protegida, no expuesta.
3. **¿Qué pasa si mando un campo extra en el body?** `forbidNonWhitelisted` responde 400 (`app.setup.ts:41`). Ejemplo: `role` en el registro.
4. **¿Cómo evitas devolver el password?** `@Exclude()` + `ClassSerializerInterceptor`, y además `select: false` (`user.entity.ts:21-22`).
5. **¿Qué contiene el JWT?** `sub` (id), `email` y `role`. Firmado con `JWT_SECRET`, expira según `JWT_EXPIRES_IN`.
6. **¿Por qué `bcrypt` con cost 10?** Es un hash lento a propósito, con salt, y dificulta la fuerza bruta.
7. **¿Cómo responde el login si el email no existe?** 401 con el mismo mensaje que con la contraseña incorrecta: no revela qué cuentas existen.
8. **¿Por qué `/vehicles/plate/:plate` va antes de `/:id`?** Las rutas se evalúan en orden; si `:id` va primero, "plate" se tomaría como id.
9. **¿Qué hace `ParseUUIDPipe`?** Valida que `:id` sea un UUID y responde 400 antes de consultar la BD.
10. **¿Cómo se evita un 500 por placa duplicada en una carrera?** El índice `UNIQUE` de la BD lanza `23505`, que el filtro traduce a 409 (`all-exceptions.filter.ts:29`).
11. **¿Qué pasa al iniciar un mantenimiento?** El vehículo pasa a IN_MAINTENANCE, se guarda `startedAt` y se valida que el mecánico no esté con otro IN_PROGRESS.
12. **¿Y al completarlo?** Se exigen los 4 datos de cierre; el vehículo vuelve a AVAILABLE y toma el kilometraje final.
13. **¿Puede un COMPLETED volver a IN_PROGRESS?** No: 409 "a completed maintenance cannot go back".
14. **¿Un técnico puede cancelar?** No, 403. Solo el admin.
15. **¿Un técnico puede ver mantenimientos de otro?** No: `/mine` usa el id del token y `GET /:id` devuelve 403 si no es el asignado.
16. **¿Por qué un vehículo SCHEDULED sigue AVAILABLE?** El enunciado ata IN_MAINTENANCE al estado IN_PROGRESS; mientras está programado, el vehículo sigue operando.
17. **¿Qué pasa si inactivo un vehículo con un mantenimiento activo?** 409: primero hay que completarlo o cancelarlo.
18. **¿Cómo se configura la app?** `.env` validado con Zod (`env.schema.ts`); si falta algo, no arranca.
19. **¿Cómo pruebas sin base de datos?** Mocks de repositorios con `getRepositoryToken` y de `DataSource.transaction`.
20. **¿Qué es `dropSchema` en los tests?** Borra el esquema de la BD de pruebas al iniciar cada suite e2e: cada una empieza limpia.
21. **¿Por qué los imports terminan en `.js`?** El proyecto es ESM y Node exige la extensión del archivo compilado.
22. **¿Por qué no `import type` en los DTOs?** Se borraría en tiempo de ejecución, Nest perdería la metadata y el ValidationPipe no validaría.
23. **¿Qué es `Relation<T>`?** Un tipo de TypeORM para relaciones bidireccionales en ESM que evita errores de importación circular.
24. **¿Qué hace `@ApiKeyAuth()` con `@Public()` adentro?** Saltar el JWT global y aplicar solo el guard de API key.
25. **¿Cómo se ve un error?** `{ success:false, statusCode, message, path, timestamp }` en todos los casos (filtro global).

---

## 5. Cambios en vivo · Live changes

> **Estrategia:** antes de tocar código, **di en voz alta qué capa vas a usar y por qué**. Eso es lo que distingue
> los 40 puntos. Después: cambia → `npm run build` → prueba en Swagger → `npm run test`.

Todas estas soluciones se **verificaron**: aplicadas juntas compilan y pasan 104 tests unitarios y 49 e2e.

### Ej. 1 · Agregar `color` al vehículo → **Entidad + DTO**
> "Es un dato nuevo: va en la **entidad** (columna) y en el **DTO** (validación). No hay regla de negocio."
```ts
// vehicle.entity.ts
@Column({ type: 'varchar', length: 30, nullable: true })
color: string | null;

// create-vehicle.dto.ts (+ importar ApiPropertyOptional, IsOptional)
@ApiPropertyOptional({ example: 'White' })
@IsOptional()
@IsString()
@MaxLength(30)
color?: string;
```
⚠️ Con un tipo `string | null` hay que poner `type: 'varchar'`: la metadata de TypeScript no puede inferir un tipo unión.
Va `nullable` para no romper los vehículos existentes. `UpdateVehicleDto` lo hereda solo (PartialType).

### Ej. 2 · No permitir programar en el pasado → **Servicio**
> "Depende del momento actual y es una regla de negocio de la creación: va en el **servicio**, junto a las demás
> validaciones de `create`."
```ts
// maintenances.service.ts, al inicio de create()
if (dto.scheduledAt < new Date()) {
  throw new BadRequestException('scheduledAt cannot be in the past');
}
```
Alternativa válida en el DTO: `@MinDate(() => new Date())`. Si lo haces, explica la diferencia: el DTO solo
protege la entrada HTTP.
⚠️ **Rompe tests unitarios:** el `createDto()` del spec usa 2026-01-10, que ya pasó. Cambia **solo** esas dos fechas
a 2027. No cambies las de `buildMaintenance`: si mueves `startedAt` a 2027, "completar con finishedAt = ahora" falla.

### Ej. 3 · Rol `MANAGER` de solo lectura → **Enum + decorador `@Auth`**
> "La autorización ya está resuelta por el RolesGuard. Solo agrego el rol al enum y lo declaro en las rutas de
> lectura. No toco guards."
```ts
// role.enum.ts
MANAGER = 'MANAGER',
// maintenances.controller.ts (y otras rutas GET que deba ver)
@Auth(Role.ADMIN, Role.MANAGER)
@Get()
```
Nota: el registro público siempre crea TECHNICIAN; un MANAGER se crearía por seed o por un endpoint de admin.

### Ej. 4 · Endpoint público de salud `GET /api/health` → **Controller + `@Public()`**
```ts
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check() { return { status: 'ok' }; }
}
// health.module.ts: @Module({ controllers: [HealthController] })  → importarlo en AppModule
```

### Ej. 5 · Header `X-Response-Time` en todas las respuestas → **Interceptor**
> "Es transversal y necesita actuar antes y después del controlador: es un **interceptor**, no un servicio."
```ts
@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const res = ctx.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap(() => res.setHeader('X-Response-Time', `${Date.now() - start}ms`)),
    );
  }
}
// app.setup.ts → app.useGlobalInterceptors(new ResponseTimeInterceptor(), new TransformInterceptor(), ...)
```

### Ej. 6 · Costo final máximo → **DTO**
> "Es un límite fijo del formato del dato, no depende de la BD: **DTO**."
```ts
// update-maintenance-status.dto.ts (+ importar Max)
@Min(0)
@Max(100_000_000)
finalCost?: number;
```

### Ej. 7 · Filtrar mantenimientos por rango de fechas → **DTO de query + servicio**
```ts
// query-maintenance.dto.ts (+ Type, IsDate)
@ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
@ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;

// maintenances.service.ts → findAll (+ importar Between)
const { page, limit, from, to, ...filters } = query;
const where = this.cleanFilters(filters);
if (from || to)
  where.scheduledAt = Between(from ?? new Date(0), to ?? new Date('9999-12-31'));
return this.findPaginated(where, { page, limit }, 'DESC');
// y en la firma de cleanFilters: Omit<QueryMaintenanceDto, 'page' | 'limit' | 'from' | 'to'>
```
Como `/mine` reutiliza `findAll`, el técnico también obtiene el filtro.

### Ej. 8 · Máximo 3 mantenimientos activos por mecánico por día → **Servicio, dentro de la transacción**
> "Necesita contar en la BD, así que va en el **servicio**. Lo pongo **dentro** de la transacción y después del lock
> del mecánico: así dos peticiones simultáneas no pueden pasar ambas con 2 existentes."
```ts
const dayStart = new Date(dto.scheduledAt);
dayStart.setUTCHours(0, 0, 0, 0);
const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
const sameDay = await manager.count(Maintenance, {
  where: {
    mechanicId: mechanic.id,
    status: In(ACTIVE_MAINTENANCE_STATUSES),
    scheduledAt: Between(dayStart, dayEnd),
  },
});
if (sameDay >= 3) throw new ConflictException(`Mechanic ${mechanic.name} already has 3 maintenances on that day`);
```
⚠️ En el spec unitario agrega `count: vi.fn(async () => 0)` al `manager` falso.

### Ej. 9 · Nuevo endpoint con API key (p. ej. vehículos disponibles) → **IntegrationsController**
> "El decorador `@ApiKeyAuth()` ya está **a nivel de clase**, así que cualquier método nuevo de ese controlador
> queda protegido con la key sin hacer nada más."
```ts
@Get('vehicles')
listAvailable() { return this.integrationsService.listAvailable(); }
// service: vehiclesService.findAll({ page: 1, limit: 100, status: VehicleStatus.AVAILABLE })
// (IntegrationsModule debe importar VehiclesModule)
```

### Ej. 10 · Agregar `error` (nombre del error) al cuerpo de las respuestas de error → **Exception Filter**
> "El formato del error es responsabilidad del filtro global; con cambiarlo ahí cambia en todos los endpoints."
```ts
// all-exceptions.filter.ts, en res.status(status).json({...})
error: HttpStatus[status],   // ej: "CONFLICT", "NOT_FOUND"
```

### Ej. 11 · Permitir que el técnico vea la lista de mecánicos → **Solo el decorador**
```ts
@Auth(Role.ADMIN, Role.TECHNICIAN)  // mechanics.controller.ts, en findAll
```

### Checklist del cambio en vivo
1. Di la **capa** y el **porqué** (DTO / Pipe / Guard / Interceptor / Filter / Servicio / Entidad).
2. Imports con `.js` y sin `import type` para clases inyectadas o DTOs.
3. `npm run build`.
4. Pruébalo en Swagger (`/docs`) con el token del rol correcto.
5. `npm run test`: si falla, lee qué fixture o mock hay que ajustar (ver Ej. 2 y Ej. 8).

---

## 6. Chuleta final · Cheat sheet

```
PIPELINE: Middleware → JwtAuthGuard → RolesGuard → Interceptor(antes) → Pipes → Controller → Service
          → Interceptor(después: ClassSerializer → Transform) → Response
          ✗ excepción en cualquier punto → AllExceptionsFilter
```

| Situación | Código |
|---|---|
| Sin token / token inválido o vencido / API key mala | 401 |
| Rol sin permiso, técnico no asignado, técnico cancela | 403 |
| Body inválido, campo extra, uuid inválido, faltan datos de cierre, kilometraje menor, fechas incoherentes | 400 |
| Vehículo, mecánico, taller o mantenimiento inexistente | 404 |
| Placa/email/nombre duplicado, vehículo ocupado, cruce de horario, inactivo, transición inválida | 409 |
| Creado | 201 · OK 200 |

**Frases clave:**
- "El DTO valida **forma**; el servicio valida **reglas que dependen de la BD o del estado**."
- "JwtAuthGuard es **global** y secure by default; lo público se marca con `@Public()`."
- "JWT autentica **personas con rol**; la API key autentica **sistemas**."
- "Cruce: `inicioExistente < finNuevo && finExistente > inicioNuevo`, sin filtrar por taller."
- "Concurrencia: transacción + `SELECT … FOR UPDATE` sobre vehículo y mecánico, siempre en el mismo orden."
- "Transacción: mantenimiento + vehículo + log son **atómicos**."
- "Seeder idempotente por **claves naturales** + transacción."
- "Mejora: `EXCLUDE USING gist` con `tstzrange` para garantizarlo en la BD."
