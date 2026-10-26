import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';                           // Fase 7
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module.js';                // Fase 7
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';   // Fase 7
import { RolesGuard } from './common/guards/roles.guard.js';        // Fase 7
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { envSchema, type Env } from './config/env.schema.js';
// import { DatabaseModule } from './database/database.module.js';    // Fase 10
// import { ProductsModule } from './products/products.module.js';    // Fase 8
import { UsersModule } from './modules/users/users.module.js';             // Fase 7

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
            validate: (config) => envSchema.parse(config),
        }),
        TypeOrmModule.forRootAsync({inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) => ({
                type: 'postgres',
                host: config.get('DB_HOST', { infer: true }),
                port: config.get('DB_PORT', { infer: true }),
                username: config.get('DB_USER', { infer: true }),
                password: config.get('DB_PASSWORD', { infer: true }),
                database: config.get('DB_NAME', { infer: true }),
                autoLoadEntities: true,
                synchronize: config.get('DB_SYNC', { infer: true }),
                dropSchema: config.get('NODE_ENV', { infer: true }) === 'test'
            })
        }),
        UsersModule,     // Fase 7
        AuthModule,      // Fase 7
        // ProductsModule,  // Fase 8
        // DatabaseModule,  // Fase 10
    ],
    providers: [
        // Fase 7: descomentar los dos guards (JwtAuthGuard primero)
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
    }
}



