# NestJS 12 base project (performance test)

This is a preconfigured base project. The test statement is in `/docs` (PDF).
Implement the use case from the statement on top of this base. Do not rebuild
the existing configuration.

## Language
EVERYTHING must be in English: code, identifiers, comments, API messages and
responses, validation messages, Swagger docs, enum values, DB names, tests,
commit messages and README. Do not leave any Spanish text.

## Stack
NestJS 12 (ESM), strict TypeScript, TypeORM + PostgreSQL, JWT (@nestjs/jwt) with
bcryptjs, class-validator + class-transformer, Swagger, Vitest + Supertest.

## Commands
- `cp .env.example .env` (first time only; `.env` is not in git)
- `docker compose up -d db db_test` (dev DB on port 5433, test DB on 5434)
- `npm i`, `npm run start:dev`, `npm run build`
- `npm run test`, `npm run test:e2e`, `npm run test:cov`
- API under `/api`, Swagger at http://localhost:3000/docs

## ESM rules (the build breaks if ignored)
- Every relative import ends in `.js` (`./users.service.js`), even for `.ts` files.
- `import type` only for interfaces/types. NEVER for classes injected through the
  constructor or for DTOs used in controllers (ValidationPipe would silently stop validating).
- Bidirectional TypeORM relations are typed with `Relation<T>`.

## Existing structure (reuse it, do not reinvent it)
- `src/common/`: `AppBaseEntity` (uuid id, createdAt, updatedAt, deletedAt for soft delete),
  decorators `@Public()`, `@Roles()`, `@CurrentUser()`, `@Auth(...roles)`,
  global `JwtAuthGuard` + `RolesGuard`, `TransformInterceptor`, `AllExceptionsFilter`,
  `LoggerMiddleware`, `PaginationDto`, `Role` enum, `JwtPayload` interface.
- `src/config/env.schema.ts`: `.env` validated with Zod. New variables go here.
- `src/app.setup.ts`: global config (prefix, CORS, helmet, ValidationPipe with
  whitelist + forbidNonWhitelisted, interceptors, filter, Swagger).
- `src/modules/`: `auth` (register/login/JWT), `users`, `products` (template CRUD
  module with pagination, ownership and soft delete), `database` (admin seed).
  Use `products` as the template for every new entity.
- Success responses: `{ success, statusCode, data, timestamp }`.
  Errors: `{ success: false, statusCode, message, path, timestamp }`.
- Tests: unit specs next to the service/controller, e2e specs in `test/`.
  `.env.test` is committed on purpose (test DB only).

## Recipe for every new entity
1. Entity extends `AppBaseEntity`; enums in `common/enums`; relations typed with `Relation<T>`.
2. DTOs with class-validator + `@ApiProperty`; `UpdateDto` uses `PartialType` from `@nestjs/swagger`.
3. Service: `NotFoundException`, business rules, `DataSource.transaction` when several tables change.
4. Controller: `@Auth(...)` or `@Public()`, `ParseUUIDPipe` on every `@Param('id')`.
5. Register the module in `app.module.ts`.
6. Unit test for the service (Vitest, AAA pattern) and an e2e test for the main flow.

## Working rules
- Users always register with role `user`; the admin comes from the seed
  (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
- Never return `password`; never commit `.env`.
- Small commits per entity or feature (`feat:`, `test:`, `fix:`), in English.
- Before finishing: `npm run build`, `npm run test` and `npm run test:e2e` must pass.
- Update the README (in English): how to run the project, env vars, endpoints of the case.