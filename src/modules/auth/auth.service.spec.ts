import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../common/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
    let service: AuthService;

    const usersService = {
        findByEmail: vi.fn(),
        findByEmailWithPassword: vi.fn(),
        create: vi.fn(),
    };
    const jwtService = { signAsync: vi.fn().mockResolvedValue('fake-token') };
    const dto = { name: 'Ana', email: 'ana@fleetcore.com', password: 'Secret1234' };

    beforeEach(async () => {
        vi.clearAllMocks();
        const moduleRef = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UsersService, useValue: usersService },
                { provide: JwtService, useValue: jwtService },
            ],
        }).compile();
        service = moduleRef.get(AuthService);
    });

    describe('register', () => {
        it('stores a hashed password, forces the TECHNICIAN role and returns a token', async () => {
            // Arrange
            usersService.findByEmail.mockResolvedValue(null);
            usersService.create.mockImplementation(async (data) => ({ id: 'u1', ...data }));
            // Act
            const result = await service.register(dto);
            // Assert
            const saved = usersService.create.mock.calls[0][0];
            expect(saved.password).not.toBe(dto.password);
            expect(saved.role).toBe(Role.TECHNICIAN);
            expect(result.accessToken).toBe('fake-token');
            expect(result.user).not.toHaveProperty('password');
        });

        it('throws ConflictException when the email already exists', async () => {
            usersService.findByEmail.mockResolvedValue({ id: 'u1' });
            await expect(service.register(dto)).rejects.toThrow(ConflictException);
            expect(usersService.create).not.toHaveBeenCalled();
        });
    });

    describe('login', () => {
        it('returns a token with valid credentials', async () => {
            usersService.findByEmailWithPassword.mockResolvedValue({
                id: 'u1', name: 'Ana', email: dto.email, role: Role.TECHNICIAN,
                password: await hash(dto.password, 4),
            });
            const result = await service.login({ email: dto.email, password: dto.password });
            expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: dto.email, role: Role.TECHNICIAN });
            expect(result.accessToken).toBe('fake-token');
        });

        it('throws UnauthorizedException when the password does not match', async () => {
            usersService.findByEmailWithPassword.mockResolvedValue({ id: 'u1', password: await hash('Other1234', 4) });
            await expect(service.login({ email: dto.email, password: dto.password }))
                .rejects.toThrow(UnauthorizedException);
        });

        it('throws UnauthorizedException when the user does not exist', async () => {
            usersService.findByEmailWithPassword.mockResolvedValue(null);
            await expect(service.login({ email: dto.email, password: dto.password }))
                .rejects.toThrow(UnauthorizedException);
        });
    });
});