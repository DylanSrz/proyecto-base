import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { envSchema } from "./config/env.schema.js";
import { TypeOrmModule } from '@nestjs/typeorm'
import type { Env } from "./config/env.schema.js";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === "test" ? ".env.test" : ".env",
            validate: (config) => envSchema.parse(config),
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
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
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }
