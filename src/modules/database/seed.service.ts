import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { Role } from '../../common/enums/role.enum.js';
import type { Env } from '../../config/env.schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        private readonly usersService: UsersService,
        private readonly config: ConfigService<Env, true>,
    ) { }

    async onApplicationBootstrap() {
        const email = this.config.get('ADMIN_EMAIL', { infer: true });
        if (await this.usersService.findByEmail(email)) return;

        await this.usersService.create({
            name: 'Administrator',
            email,
            password: await hash(this.config.get('ADMIN_PASSWORD', { infer: true }), 10),
            role: Role.ADMIN,
        });
        this.logger.log(`Admin created: ${email}`);
    }
}